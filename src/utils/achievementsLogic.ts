import { PrismaClient, DailyRecord, User } from '@prisma/client';
import { getDateKey } from './dateUtils';

// This function processes all rules and returns an array of newly unlocked achievement codes
export async function processAchievements(
    userId: string,
    prisma: PrismaClient,
    records: DailyRecord[],
    user: User,
    actionContext?: {
        isNewPoop?: boolean;
        isMistake?: boolean;
        isPeriodStart?: boolean;
        isPeriodEnd?: boolean;
        isPartnerConnected?: boolean;
    }
): Promise<string[]> {
    const newlyUnlocked: string[] = [];

    // Get current unlocked achievements
    const currentAchievements = await prisma.userAchievement.findMany({
        where: { userId }
    });
    const unlockedCodes = new Set(currentAchievements.map(a => a.code));

    const unlock = async (code: string) => {
        if (!unlockedCodes.has(code)) {
            await prisma.userAchievement.create({
                data: {
                    userId,
                    code
                }
            });
            unlockedCodes.add(code);
            newlyUnlocked.push(code);
        }
    };

    // Calculate poop stats
    const poopRecords = records.filter(r => r.counterValue > 0).sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime());
    const poopCount = poopRecords.length;

    // Poop Rules
    if (poopCount > 0) {
        await unlock('FIRST_DROP');
    }

    let maxInDay = 0;
    poopRecords.forEach(r => {
        if (r.counterValue > maxInDay) maxInDay = r.counterValue;
        if (r.counterValue >= 2) unlock('DOUBLE_TROUBLE');
        if (r.counterValue >= 3) unlock('THE_MACHINE');
        if (r.counterValue >= 5) unlock('OVERACHIEVER');
        
        const date = new Date(r.dateKey);
        if (date.getUTCDay() === 2) {
            unlock('TACO_TUESDAY');
        }
    });

    // Weekend Warrior
    const saturdayDates = poopRecords.filter(r => new Date(r.dateKey).getUTCDay() === 6).map(r => r.dateKey);
    const sundayDates = poopRecords.filter(r => new Date(r.dateKey).getUTCDay() === 0).map(r => r.dateKey);
    for (const sat of saturdayDates) {
        const satDate = new Date(sat + 'T00:00:00');
        satDate.setDate(satDate.getDate() + 1); // Get Sunday
        const expectedSunDateKey = getDateKey(satDate.getFullYear(), satDate.getMonth(), satDate.getDate());
        if (sundayDates.includes(expectedSunDateKey)) {
            await unlock('WEEKEND_WARRIOR');
        }
    }

    // Consecutives
    let currentStreak = 0;
    let maxStreak = 0;
    for (let i = 0; i < poopRecords.length; i++) {
        if (i === 0) {
            currentStreak = 1;
        } else {
            const prevDate = new Date(poopRecords[i - 1].dateKey);
            const currDate = new Date(poopRecords[i].dateKey);
            const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);
            if (diffDays === 1) {
                currentStreak++;
            } else if (diffDays > 1) {
                currentStreak = 1;
            }
        }
        if (currentStreak > maxStreak) maxStreak = currentStreak;
        
        if (currentStreak >= 3) unlock('THE_REGULAR');
        if (currentStreak >= 7) unlock('IRON_BOWEL');
        if (currentStreak >= 30) unlock('GOD_TIER');
    }

    // Ghost Town & The Constipated
    if (poopCount > 0) {
        const lastPoopDate = new Date(poopRecords[poopCount - 1].dateKey);
        const today = new Date();
        const diffFromToday = (today.getTime() - lastPoopDate.getTime()) / (1000 * 3600 * 24);
        if (diffFromToday >= 3) {
            await unlock('GHOST_TOWN');
        }
        if (diffFromToday >= 7) {
            await unlock('THE_CONSTIPATED');
        }
    }

    // Night Owl / Early Bird / Lucky Drop
    if (actionContext?.isNewPoop) {
        const currentHour = new Date().getHours();
        if (currentHour >= 0 && currentHour <= 4) {
            await unlock('NIGHT_OWL');
        } else if (currentHour >= 5 && currentHour <= 7) {
            await unlock('EARLY_BIRD');
        }

        const roll = Math.random();
        if (roll < 0.001) { // 0.1% chance
            await unlock('GACHA_WHALE');
        } else if (roll < 0.01) { // 1% chance
            await unlock('LUCKY_DROP');
        }
    }

    // Oopsie
    if (actionContext?.isMistake) {
        await unlock('OOPSIE');
    }

    // Period Rules
    const periodStarts = records.filter(r => r.status === 'start');
    const periodEnds = records.filter(r => r.status === 'end');

    if (periodStarts.length > 0) {
        await unlock('CRIMSON_TIDE');
    }

    if (periodStarts.length > 0 && periodEnds.length > 0) {
        await unlock('RED_WEDDING');
    }

    // False Alarm
    const startKeys = periodStarts.map(s => s.dateKey);
    const falseAlarm = periodEnds.some(e => startKeys.includes(e.dateKey));
    if (falseAlarm) {
        await unlock('FALSE_ALARM');
    }

    // Shark Week & Bloodbath
    for (const start of periodStarts) {
        const end = periodEnds.find(e => new Date(e.dateKey) > new Date(start.dateKey));
        if (end) {
            const days = (new Date(end.dateKey).getTime() - new Date(start.dateKey).getTime()) / (1000 * 3600 * 24) + 1;
            if (days === 7) {
                await unlock('SHARK_WEEK');
            }
            if (days >= 10) {
                await unlock('BLOODBATH');
            }
        }
    }

    // Partner/Social Rules
    if (user.partnerId || actionContext?.isPartnerConnected) {
        await unlock('PARTNER_IN_CRIME');
    }

    // Partner Sync Rules
    if (user.partnerId) {
        const partnerRecords = await prisma.dailyRecord.findMany({
            where: { userId: user.partnerId }
        });

        const myDates = new Set(poopRecords.map(r => r.dateKey));
        const partnerPoopDates = partnerRecords.filter(r => r.counterValue > 0).map(r => r.dateKey);

        const hasSync = partnerPoopDates.some(d => myDates.has(d));
        if (hasSync) {
            await unlock('SYNCHRONIZATION');
        }

        const myStarts = periodStarts.map(r => r.dateKey);
        const partnerStarts = partnerRecords.filter(r => r.status === 'start').map(r => r.dateKey);

        const hasBloodMoon = myStarts.some(d => partnerStarts.includes(d));
        if (hasBloodMoon) {
            await unlock('BLOOD_MOON');
        }
    }

    return newlyUnlocked;
}
