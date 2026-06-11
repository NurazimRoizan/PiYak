import { getDateKey } from './dateUtils';
import { DailyData } from './types';

export function calculatePoopStreak(today: Date, dailyCounts: Record<string, number>): number {
    let currentStreak = 0;
    // Start checking from TODAY backwards
    let checkDate = new Date(today);
    checkDate.setHours(0, 0, 0, 0);

    // Loop backwards to find consecutive days with counts > 0
    while (true) {
        const dateKey = getDateKey(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());

        if ((dailyCounts[dateKey] || 0) > 0) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1); // Go to previous day
        } else {
            break; // Break streak if a day is missed
        }
    }
    return currentStreak;
}

export function getPoopStatusMessage(streak: number, countToday: number): string {
    const randomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    if (streak === 3) {
        return randomItem([
            "A 3-DAY HAT TRICK. THE TOILET IS BEGGING FOR MERCY.",
            "3 DAYS IN A ROW. YOU ARE JUST WARMING UP."
        ]);
    } else if (streak === 4) {
        return randomItem([
            "4 DAYS STRAIGHT. PLUMBING INTEGRITY IS COMPROMISED.",
            "DAY 4. THE PORCELAIN GODS WEEP."
        ]);
    } else if (streak === 5) {
        return randomItem([
            "5 DAYS PENTAKILL. YOU ARE A BIOLOGICAL WEAPON.",
            "DAY 5. MANAGEMENT IS TERRIFIED OF YOUR EFFICIENCY."
        ]);
    } else if (streak === 6) {
        return "DAY 6. WHY WAS 6 AFRAID OF 7?";
    } else if (streak === 7) {
        return "DAY 7. BECAUSE 7 IS A REGISTERED 6 OFFENDER.";
    } else if (streak > 7) {
        return randomItem([
            `${streak} DAYS OWNING THE TOILET.`,
            `${streak} DAYS RULING THE BATHROOM.`,
            `THE BOSS IS ON A ${streak} DAY STREAK.`
        ]);
    } else if (countToday >= 1) {
        return randomItem([
            "YOU DESTROYED THE TOILET. BOSS MOVE.",
            "THE THRONE HAS BEEN CONQUERED.",
            "BATHROOM DOMINATION SUCCESSFUL."
        ]);
    } else {
        return randomItem([
            "THE TOILET IS WAITING FOR THE BOSS.",
            "CLAIM YOUR SEAT. THE BATHROOM IS YOURS.",
            "THE THRONE IS EMPTY. GO DO DAMAGE."
        ]);
    }
}
