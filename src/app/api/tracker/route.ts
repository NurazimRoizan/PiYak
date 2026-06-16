import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { processAchievements } from '@/utils/achievementsLogic';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedPartnerId = searchParams.get('partnerId');

    let targetUserId = userId;

    if (requestedPartnerId) {
        // Verify authorization
        const currentUser = await prisma.user.findUnique({ where: { id: userId } });
        if (currentUser?.partnerId !== requestedPartnerId) {
            return new NextResponse("Forbidden: You are not connected to this partner", { status: 403 });
        }
        targetUserId = requestedPartnerId;
    }

    try {
        const records = await prisma.dailyRecord.findMany({
            where: { userId: targetUserId }
        });

        const counts: Record<string, number> = {};
        const statuses: Record<string, string> = {};

        records.forEach(r => {
            if (r.counterValue > 0) counts[r.dateKey] = r.counterValue;
            if (r.status) statuses[r.dateKey] = r.status;
        });

        return NextResponse.json({ counts, statuses });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await request.json();
        const { date, count, status, partnerId, localHour } = body;
        
        if (partnerId && partnerId !== userId) {
            return new NextResponse("Forbidden: Cannot modify partner's data", { status: 403 });
        }

        const targetUserId = userId;

        // Ensure user exists first
        await prisma.user.upsert({
            where: { id: targetUserId },
            update: {},
            create: { id: targetUserId }
        });

        // Get previous record
        const previousRecord = await prisma.dailyRecord.findUnique({
            where: { userId_dateKey: { userId: targetUserId, dateKey: date } }
        });

        if (count === 0 && (!status || status === 'clear')) {
            // Delete record if it's completely cleared
            await prisma.dailyRecord.deleteMany({
                where: { userId: targetUserId, dateKey: date }
            });
        } else {
            await prisma.dailyRecord.upsert({
                where: { userId_dateKey: { userId: targetUserId, dateKey: date } },
                update: { counterValue: count, status: status === 'clear' ? null : (status || null) },
                create: { userId: targetUserId, dateKey: date, counterValue: count, status: status === 'clear' ? null : (status || null) }
            });
        }

        // Notification logic
        if (count > (previousRecord?.counterValue || 0)) {
            // A new poop was logged! Find snoopers
            const snoopers = await prisma.user.findMany({
                where: { partnerId: targetUserId },
                include: { pushSubscriptions: true }
            });

            if (snoopers.length > 0) {
                const notificationsToCreate = snoopers.map(s => ({
                    userId: s.id,
                    message: "Your partner just logged a poop! 💩"
                }));
                
                await prisma.notification.createMany({
                    data: notificationsToCreate
                });

                if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
                    try {
                        const webPush = (await import('web-push')).default;
                        webPush.setVapidDetails(
                            process.env.NEXT_PUBLIC_VAPID_SUBJECT || 'mailto:test@example.com',
                            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                            process.env.VAPID_PRIVATE_KEY
                        );

                        const payload = JSON.stringify({
                            title: 'PiYak Update',
                            message: 'Your partner just logged a poop! 💩'
                        });

                        snoopers.forEach(snooper => {
                            snooper.pushSubscriptions.forEach(sub => {
                                const pushSubscription = {
                                    endpoint: sub.endpoint,
                                    keys: {
                                        auth: sub.auth,
                                        p256dh: sub.p256dh
                                    }
                                };
                                webPush.sendNotification(pushSubscription, payload).catch(err => {
                                    console.error("Failed to send push", err);
                                    if (err.statusCode === 410 || err.statusCode === 404) {
                                        prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(console.error);
                                    }
                                });
                            });
                        });
                    } catch (err) {
                        console.error("Web Push setup error:", err);
                    }
                }
            }
        }

        // Process Achievements
        const allRecords = await prisma.dailyRecord.findMany({
            where: { userId: targetUserId }
        });
        
        const user = await prisma.user.findUnique({ where: { id: targetUserId } });
        
        let newlyUnlocked: string[] = [];
        if (user) {
            newlyUnlocked = await processAchievements(
                targetUserId,
                prisma,
                allRecords,
                user,
                {
                    isNewPoop: count > (previousRecord?.counterValue || 0),
                    isMistake: count < (previousRecord?.counterValue || 0),
                    isPeriodStart: status === 'start',
                    isPeriodEnd: status === 'end',
                    localHour: typeof localHour === 'number' ? localHour : undefined
                }
            );
        }

        return NextResponse.json({ success: true, newlyUnlocked });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
