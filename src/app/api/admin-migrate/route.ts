import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const maxDuration = 60; // Allow maximum serverless execution window

export async function GET() {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const dbUsers = await prisma.user.findMany({
            include: {
                _count: {
                    select: { 
                        records: true,
                        achievements: true 
                    }
                }
            },
            orderBy: {
                records: { _count: 'desc' }
            }
        });

        // Try to fetch Clerk names/emails for friendly display
        const clerkNamesMap: Record<string, string> = {};
        try {
            const client = await clerkClient();
            const clerkList = await client.users.getUserList({ limit: 100 });
            for (const u of clerkList.data) {
                const label = u.username || u.firstName || u.emailAddresses[0]?.emailAddress || 'User';
                clerkNamesMap[u.id] = label;
            }
        } catch (err) {
            console.warn("Could not fetch Clerk user list for friendly names:", err);
        }

        return NextResponse.json({
            currentUserId: userId,
            users: dbUsers.map(u => ({
                id: u.id,
                name: clerkNamesMap[u.id] || 'Unknown User',
                recordCount: u._count.records,
                achievementCount: u._count.achievements,
                partnerId: u.partnerId,
                appMode: u.appMode
            }))
        });
    } catch (e: any) {
        console.error("Failed to list users for migration:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { oldId } = await request.json();
        const newId = currentUserId; // Strictly locked to current authenticated caller

        if (!oldId || typeof oldId !== 'string') {
            return NextResponse.json({ error: "Missing or invalid oldId" }, { status: 400 });
        }

        if (oldId === newId) {
            return NextResponse.json({ error: "Cannot migrate an account to itself" }, { status: 400 });
        }

        // 1. Ensure NEW user exists in DB
        const newUser = await prisma.user.upsert({
            where: { id: newId },
            update: {},
            create: { id: newId }
        });

        // 2. Fetch OLD user
        const oldUser = await prisma.user.findUnique({
            where: { id: oldId }
        });

        if (!oldUser) {
            return NextResponse.json({ error: "Old account not found in database" }, { status: 404 });
        }

        // 3. Clear any initial scratch data on the new account to prevent unique constraint collisions
        await prisma.dailyRecord.deleteMany({
            where: { userId: newId }
        });
        await prisma.userAchievement.deleteMany({
            where: { userId: newId }
        });

        // 4. High-speed atomic batch transfer via a single SQL transaction (takes < 1 second)
        await prisma.$transaction([
            prisma.dailyRecord.updateMany({
                where: { userId: oldId },
                data: { userId: newId }
            }),
            prisma.userAchievement.updateMany({
                where: { userId: oldId },
                data: { userId: newId }
            }),
            prisma.notification.updateMany({
                where: { userId: oldId },
                data: { userId: newId }
            }),
            prisma.pushSubscription.updateMany({
                where: { userId: oldId },
                data: { userId: newId }
            }),
            prisma.user.updateMany({
                where: { partnerId: oldId },
                data: { partnerId: newId }
            })
        ]);

        // 5. Transfer User Settings (appMode, periodSettings, partnerId)
        await prisma.user.update({
            where: { id: newId },
            data: {
                appMode: oldUser.appMode,
                periodSettings: oldUser.periodSettings,
                partnerId: oldUser.partnerId
            }
        });

        // 6. Transfer Invite Code if applicable
        if (oldUser.inviteCode) {
            const oldInviteCode = oldUser.inviteCode;
            await prisma.user.update({
                where: { id: oldId },
                data: { inviteCode: null }
            });
            if (!newUser.inviteCode) {
                await prisma.user.update({
                    where: { id: newId },
                    data: { inviteCode: oldInviteCode }
                });
            }
        }

        // 7. Delete the old empty user row
        await prisma.user.delete({
            where: { id: oldId }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully migrated all data from ${oldId} to ${newId}!`
        });

    } catch (e: any) {
        console.error("Migration error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
