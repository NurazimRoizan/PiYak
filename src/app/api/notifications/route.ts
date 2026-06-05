import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId,
                isRead: false
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        return NextResponse.json({ notifications });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { notificationId } = await request.json();

        if (notificationId) {
            await prisma.notification.updateMany({
                where: {
                    id: notificationId,
                    userId
                },
                data: {
                    isRead: true
                }
            });
        } else {
            // Mark all as read if no specific ID provided
            await prisma.notification.updateMany({
                where: {
                    userId,
                    isRead: false
                },
                data: {
                    isRead: true
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
