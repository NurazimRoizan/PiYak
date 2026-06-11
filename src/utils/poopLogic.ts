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

    if (streak > 2) {
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
