import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { processAchievements } from '@/utils/achievementsLogic';

const prisma = new PrismaClient();

// Function to generate a random 6-character code
function generateInviteCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
}

export async function GET(request: Request) {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        let user = await prisma.user.findUnique({ where: { id: userId } });
        
        // Auto-generate invite code if they don't have one
        if (!user || !user.inviteCode) {
            let newCode = generateInviteCode();
            let isUnique = false;
            
            // Ensure uniqueness
            while (!isUnique) {
                const existing = await prisma.user.findUnique({ where: { inviteCode: newCode } });
                if (!existing) {
                    isUnique = true;
                } else {
                    newCode = generateInviteCode();
                }
            }

            user = await prisma.user.upsert({
                where: { id: userId },
                update: { inviteCode: newCode },
                create: { id: userId, inviteCode: newCode }
            });
        }

        let partnerUsername = null;
        let partnerImageUrl = null;
        
        if (user.partnerId) {
            try {
                const client = await clerkClient();
                const partnerUser = await client.users.getUser(user.partnerId);
                partnerUsername = partnerUser.username || partnerUser.firstName || "Partner";
                partnerImageUrl = partnerUser.imageUrl || null;
            } catch (err) {
                console.error("Failed to fetch partner from Clerk", err);
            }
        }

        return NextResponse.json({ 
            inviteCode: user.inviteCode,
            partnerId: user.partnerId,
            partnerUsername,
            partnerImageUrl
        });
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
        const { inviteCode } = await request.json();
        if (!inviteCode || typeof inviteCode !== 'string') {
            return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
        }

        const cleanCode = inviteCode.trim().toUpperCase();

        const targetUser = await prisma.user.findUnique({
            where: { inviteCode: cleanCode }
        });

        if (!targetUser) {
            return NextResponse.json({ error: "Partner not found with this code" }, { status: 404 });
        }

        if (targetUser.id === userId) {
            return NextResponse.json({ error: "You cannot partner with yourself" }, { status: 400 });
        }

        // Set current user's partnerId to the target user's ID
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { partnerId: targetUser.id }
        });

        // Feature: Centralized Discord Notifications & Geo-Stalker
        try {
            fetch("https://api.jimiroi.com/track", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-vercel-ip-country": request.headers.get("x-vercel-ip-country") || "",
                    "x-vercel-ip-city": request.headers.get("x-vercel-ip-city") || "",
                    "user-agent": request.headers.get("user-agent") || ""
                },
                body: JSON.stringify({ event: "partner_linked", project: "PiYak" })
            }).catch(e => console.error(e));
        } catch (e) {
            console.error("Failed to ping jimiroi-api:", e);
        }

        const allRecords = await prisma.dailyRecord.findMany({ where: { userId } });
        const newlyUnlocked = await processAchievements(userId, prisma, allRecords, updatedUser, { isPartnerConnected: true });

        return NextResponse.json({ success: true, partnerId: targetUser.id, newlyUnlocked });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { partnerId: null }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
