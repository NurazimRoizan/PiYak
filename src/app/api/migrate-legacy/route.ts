import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK9fqXn-Mhw9u7FwI4PA4A3qj5t6D9qjVo07PZw1GD5FL47cyFyljhXFoWys9QNrVD1w/exec';

async function fetchLegacyData(username: string) {
    const res = await fetch(`${APP_SCRIPT_URL}?userID=${encodeURIComponent(username)}&callback=myCallback`);
    const text = await res.text();
    // text is like myCallback({"dailyCounters":{...}})
    const jsonStr = text.replace(/^myCallback\(/, '').replace(/\)$/, '');
    return JSON.parse(jsonStr).dailyCounters || {};
}

function parseValue(val: string) {
    if (val.includes('|')) {
        const parts = val.split('|');
        return {
            count: parseInt(parts[0]) || 0,
            status: parts[1] || null
        };
    } else {
        return {
            count: 0,
            status: val || null
        };
    }
}

export async function GET(request: Request) {
    try {
        const client = await clerkClient();
        
        // Find users
        const users = await client.users.getUserList();
        
        const geeUser = users.data.find(u => u.username?.toLowerCase() === 'geey' || u.firstName?.toLowerCase() === 'geey');
        const nyottUser = users.data.find(u => u.username?.toLowerCase() === 'nyott' || u.firstName?.toLowerCase() === 'nyott');

        const results: any = {};

        if (geeUser) {
            // Make sure user exists in Prisma
            await prisma.user.upsert({
                where: { id: geeUser.id },
                update: {},
                create: { id: geeUser.id }
            });

            const geeData = await fetchLegacyData('Gee');
            let geeCount = 0;
            for (const [dateKey, val] of Object.entries(geeData)) {
                const parsed = parseValue(val as string);
                await prisma.dailyRecord.upsert({
                    where: { userId_dateKey: { userId: geeUser.id, dateKey } },
                    update: { counterValue: parsed.count, status: parsed.status },
                    create: { userId: geeUser.id, dateKey, counterValue: parsed.count, status: parsed.status }
                });
                geeCount++;
            }
            results.gee = `Migrated ${geeCount} records for Gee`;
        } else {
            results.gee = "User 'Gee' not found in Clerk";
        }

        if (nyottUser) {
             // Make sure user exists in Prisma
             await prisma.user.upsert({
                where: { id: nyottUser.id },
                update: {},
                create: { id: nyottUser.id }
            });

            const nyottData = await fetchLegacyData('nyott');
            let nyottCount = 0;
            for (const [dateKey, val] of Object.entries(nyottData)) {
                const parsed = parseValue(val as string);
                await prisma.dailyRecord.upsert({
                    where: { userId_dateKey: { userId: nyottUser.id, dateKey } },
                    update: { counterValue: parsed.count, status: parsed.status },
                    create: { userId: nyottUser.id, dateKey, counterValue: parsed.count, status: parsed.status }
                });
                nyottCount++;
            }
            results.nyott = `Migrated ${nyottCount} records for nyott`;
        } else {
            results.nyott = "User 'nyott' not found in Clerk";
        }

        return NextResponse.json({ success: true, results });

    } catch (e: any) {
        console.error("Migration Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
