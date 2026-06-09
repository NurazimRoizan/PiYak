import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';

const prisma = new PrismaClient();

// Configure web-push
webpush.setVapidDetails(
    'mailto:hello@piyak.app', // Or any contact email
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
    process.env.VAPID_PRIVATE_KEY || ''
);

export async function GET(request: Request) {
    // Check for Vercel Cron header to ensure it's a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Find all unique push subscriptions
        const subscriptions = await prisma.pushSubscription.findMany();

        // Send a notification to each subscription
        const payload = JSON.stringify({
            title: "🎁 Yak Wrapped is ready!",
            body: "Your monthly recap is ready. Open PiYak to see your stats!",
            url: "/",
        });

        const sendPromises = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth,
                        },
                    },
                    payload
                );
            } catch (err: any) {
                // If subscription is gone, remove it from DB
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await prisma.pushSubscription.delete({
                        where: { id: sub.id }
                    });
                } else {
                    console.error('Error sending push notification', err);
                }
            }
        });

        await Promise.allSettled(sendPromises);

        return NextResponse.json({ success: true, message: `Sent ${subscriptions.length} notifications.` });
    } catch (error) {
        console.error('Failed to run monthly cron:', error);
        return NextResponse.json({ error: 'Failed to run cron job' }, { status: 500 });
    }
}
