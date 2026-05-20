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
    if (streak > 2) {
        return `You are on the roll !! ${streak} days streak !!`;
    } else if (countToday >= 1) {
        return "Bowel movement doing great today !";
    } else {
        return "Poopie time !!";
    }
}
