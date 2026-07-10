import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const users = await prisma.user.findMany({
            include: {
                _count: {
                    select: { records: true }
                }
            },
            orderBy: {
                records: { _count: 'desc' }
            }
        });

        return NextResponse.json({
            currentUserId: userId,
            users: users.map(u => ({
                id: u.id,
                recordCount: u._count.records,
                partnerId: u.partnerId,
                appMode: u.appMode
            }))
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const { oldId, newId } = await request.json();
        
        if (!oldId || !newId) {
            return new NextResponse("Missing oldId or newId", { status: 400 });
        }

        // 1. Ensure the NEW user exists in DB
        await prisma.user.upsert({
            where: { id: newId },
            update: {},
            create: { id: newId }
        });

        // 2. Fetch old user to copy settings
        const oldUser = await prisma.user.findUnique({
            where: { id: oldId }
        });

        if (oldUser) {
            await prisma.user.update({
                where: { id: newId },
                data: {
                    appMode: oldUser.appMode,
                    periodSettings: oldUser.periodSettings,
                    partnerId: oldUser.partnerId,
                    inviteCode: oldUser.inviteCode // Note: this might fail if newId already generated an inviteCode, but new users usually don't have one initially
                }
            }).catch(() => {
                // If invite code conflict, just skip inviteCode transfer
                console.log("Could not transfer invite code, likely already exists.");
            });
        }

        // 3. Move all related data with collision handling
        
        // --- Achievements ---
        const oldAchievements = await prisma.userAchievement.findMany({ where: { userId: oldId } });
        for (const ach of oldAchievements) {
            try {
                await prisma.userAchievement.update({
                    where: { id: ach.id },
                    data: { userId: newId }
                });
            } catch (err) {
                // If it already exists for the new user, delete the old duplicate
                await prisma.userAchievement.delete({ where: { id: ach.id } });
            }
        }

        // --- Daily Records ---
        const oldRecords = await prisma.dailyRecord.findMany({ where: { userId: oldId } });
        for (const rec of oldRecords) {
            try {
                await prisma.dailyRecord.update({
                    where: { id: rec.id },
                    data: { userId: newId }
                });
            } catch (err) {
                // If the new user already logged a record for this date, delete the old duplicate
                await prisma.dailyRecord.delete({ where: { id: rec.id } });
            }
        }

        // --- Notifications ---
        await prisma.notification.updateMany({
            where: { userId: oldId },
            data: { userId: newId }
        });

        // --- Push Subscriptions ---
        const oldSubs = await prisma.pushSubscription.findMany({ where: { userId: oldId } });
        for (const sub of oldSubs) {
            try {
                await prisma.pushSubscription.update({
                    where: { id: sub.id },
                    data: { userId: newId }
                });
            } catch (err) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } });
            }
        }

        // --- Partner Links ---
        // If anyone had the oldId as their partner, update them to point to the newId
        await prisma.user.updateMany({
            where: { partnerId: oldId },
            data: { partnerId: newId }
        });

        // 4. Delete the old user
        if (oldUser) {
            await prisma.user.delete({
                where: { id: oldId }
            });
        }

        return NextResponse.json({ success: true, message: `Migrated ${oldId} to ${newId}` });
    } catch (e: any) {
        console.error("Migration error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
