import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const currentUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!currentUser || !currentUser.partnerId) {
            return NextResponse.json({ error: "You do not have a partner connected to extract history from." }, { status: 400 });
        }

        // Fetch notifications that were sent TO YOUR PARTNER (which means YOU triggered them)
        const partnerNotifications = await prisma.notification.findMany({
            where: {
                userId: currentUser.partnerId,
                message: {
                    contains: "poop"
                },
                createdAt: {
                    gte: new Date("2026-07-01T00:00:00Z"),
                    lt: new Date("2026-08-01T00:00:00Z")
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        // Group the timestamps by date
        const poopHistory: Record<string, number> = {};
        
        partnerNotifications.forEach(notif => {
            // Convert UTC to local date string roughly
            const dateObj = new Date(notif.createdAt);
            const dateKey = dateObj.toISOString().split('T')[0];
            
            if (!poopHistory[dateKey]) {
                poopHistory[dateKey] = 0;
            }
            poopHistory[dateKey] += 1;
        });

        // Also fetch your own achievements in July
        const yourAchievements = await prisma.userAchievement.findMany({
            where: {
                userId: userId,
                unlockedAt: {
                    gte: new Date("2026-07-01T00:00:00Z"),
                    lt: new Date("2026-08-01T00:00:00Z")
                }
            },
            orderBy: {
                unlockedAt: 'asc'
            }
        });

        return NextResponse.json({
            inferredPoops: poopHistory,
            achievements: yourAchievements.map(a => ({
                code: a.code,
                date: new Date(a.unlockedAt).toISOString().split('T')[0]
            }))
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
