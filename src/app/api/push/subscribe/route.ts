import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await request.json();
        const { endpoint, keys } = body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return new NextResponse("Invalid subscription object", { status: 400 });
        }

        // Upsert the push subscription for the user
        await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                userId,
                p256dh: keys.p256dh,
                auth: keys.auth
            },
            create: {
                userId,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth
            }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Push Subscribe Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
