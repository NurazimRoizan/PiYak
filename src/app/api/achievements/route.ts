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
    const requestedPartnerId = searchParams.get('partnerId');

    let targetUserId = userId;

    if (requestedPartnerId) {
        const currentUser = await prisma.user.findUnique({ where: { id: userId } });
        if (currentUser?.partnerId !== requestedPartnerId) {
            return new NextResponse("Forbidden: You are not connected to this partner", { status: 403 });
        }
        targetUserId = requestedPartnerId;
    }

    try {
        const achievements = await prisma.userAchievement.findMany({
            where: { userId: targetUserId }
        });
        const unlockedCodes = achievements.map(a => a.code);
        return NextResponse.json({ unlockedCodes });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
