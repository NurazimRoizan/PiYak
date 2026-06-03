import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('partnerId') || userId;

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
        const { date, count, status, partnerId } = body;
        
        const targetUserId = partnerId || userId;

        // Ensure user exists first
        await prisma.user.upsert({
            where: { id: targetUserId },
            update: {},
            create: { id: targetUserId }
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

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
