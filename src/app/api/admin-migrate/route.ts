import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        const newId = currentUserId; // Strictly bound to current authenticated caller

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

        // 2. Fetch OLD user with all relations
        const oldUser = await prisma.user.findUnique({
            where: { id: oldId },
            include: {
                records: true,
                achievements: true,
                notifications: true,
                pushSubscriptions: true
            }
        });

        if (!oldUser) {
            return NextResponse.json({ error: "Old account not found in database" }, { status: 404 });
        }

        // 3. Migrate DailyRecords safely (handling unique constraint collisions on [userId, dateKey])
        for (const oldRec of oldUser.records) {
            const existingNewRec = await prisma.dailyRecord.findUnique({
                where: { userId_dateKey: { userId: newId, dateKey: oldRec.dateKey } }
            });

            if (existingNewRec) {
                await prisma.dailyRecord.update({
                    where: { id: existingNewRec.id },
                    data: {
                        counterValue: Math.max(existingNewRec.counterValue, oldRec.counterValue),
                        status: existingNewRec.status || oldRec.status
                    }
                });
                await prisma.dailyRecord.delete({ where: { id: oldRec.id } });
            } else {
                await prisma.dailyRecord.update({
                    where: { id: oldRec.id },
                    data: { userId: newId }
                });
            }
        }

        // 4. Migrate UserAchievements safely (handling unique constraint collisions on [userId, code])
        for (const oldAch of oldUser.achievements) {
            const existingNewAch = await prisma.userAchievement.findUnique({
                where: { userId_code: { userId: newId, code: oldAch.code } }
            });

            if (existingNewAch) {
                await prisma.userAchievement.delete({ where: { id: oldAch.id } });
            } else {
                await prisma.userAchievement.update({
                    where: { id: oldAch.id },
                    data: { userId: newId }
                });
            }
        }

        // 5. Migrate Notifications & PushSubscriptions
        await prisma.notification.updateMany({
            where: { userId: oldId },
            data: { userId: newId }
        });

        await prisma.pushSubscription.updateMany({
            where: { userId: oldId },
            data: { userId: newId }
        });

        // 6. Update Partner links
        // A) If old user was connected to a partner:
        if (oldUser.partnerId) {
            await prisma.user.update({
                where: { id: newId },
                data: { partnerId: oldUser.partnerId }
            });
        }
        // B) If anyone had oldId as their partner (e.g. partner's account):
        await prisma.user.updateMany({
            where: { partnerId: oldId },
            data: { partnerId: newId }
        });

        // 7. Transfer User Settings (appMode, periodSettings)
        await prisma.user.update({
            where: { id: newId },
            data: {
                appMode: oldUser.appMode,
                periodSettings: oldUser.periodSettings,
            }
        });

        // 8. Transfer Invite Code if applicable
        if (oldUser.inviteCode) {
            const oldInviteCode = oldUser.inviteCode;
            // Clear old invite code first to prevent unique constraint conflict
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

        // 9. Delete the old user row
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
