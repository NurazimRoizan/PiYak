import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const records = await prisma.dailyRecord.findMany({
            where: { userId },
            orderBy: { dateKey: 'desc' }
        });

        return NextResponse.json({ records });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const { recordIds } = await request.json();
        
        if (!recordIds || !Array.isArray(recordIds)) {
            return new NextResponse("Invalid recordIds", { status: 400 });
        }

        // Only delete records that belong to THIS user
        await prisma.dailyRecord.deleteMany({
            where: {
                id: { in: recordIds },
                userId: userId
            }
        });

        return NextResponse.json({ success: true, message: `Deleted ${recordIds.length} records.` });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
