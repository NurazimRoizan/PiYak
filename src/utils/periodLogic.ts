import { PeriodSettings, PeriodStatus } from './types';
import { parseDateKey } from './dateUtils';

export function getPeriodStatus(
    dateKey: string,
    periodStartDate: string | null,
    periodSettings: PeriodSettings,
    dailyCounters: Record<string, string>
): PeriodStatus {
    if (!periodStartDate) return null;

    const sheetStatus = dailyCounters[dateKey];
    if (sheetStatus && ['start', 'end', 'flow'].includes(sheetStatus)) {
        return sheetStatus as PeriodStatus;
    }

    const startDate = parseDateKey(periodStartDate);
    const currentDate = parseDateKey(dateKey);
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const timeDiff = currentDate.getTime() - startDate.getTime();
    const daysSinceStart = Math.round(timeDiff / MS_PER_DAY);

    if (daysSinceStart >= periodSettings.cycleLength) {
        if (['start', 'end', 'flow'].includes(dailyCounters[dateKey])) {
            return dailyCounters[dateKey] as PeriodStatus;
        }
        return null;
    }

    const cycleDay = (daysSinceStart % periodSettings.cycleLength + periodSettings.cycleLength) % periodSettings.cycleLength;

    if (daysSinceStart >= 0) {
        const ovulationDay = periodSettings.cycleLength - 14;
        if (cycleDay === ovulationDay) {
            return 'predicted_ovulation';
        }

        if (cycleDay >= ovulationDay - 5 && cycleDay < ovulationDay) {
            return 'fertile_window';
        }

        if (cycleDay < periodSettings.periodLength) {
            return 'predicted_period';
        }
    }

    return null;
}

export function calculateNextOvulation(
    periodStartDate: string | null,
    periodSettings: PeriodSettings
): string {
    if (!periodStartDate) {
        return "Prediction Status: Awaiting Start Date...";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const cycleLength = periodSettings.cycleLength;
    const ovulationDayOffset = cycleLength - 14;
    const periodStartOffset = 0;

    let startDateObj = parseDateKey(periodStartDate);

    while (startDateObj.getTime() < today.getTime()) {
        startDateObj.setDate(startDateObj.getDate() + cycleLength);
    }

    let nextOvulationDate = new Date(startDateObj);
    if (nextOvulationDate.getTime() > today.getTime()) {
        nextOvulationDate.setDate(nextOvulationDate.getDate() - cycleLength);
    }

    nextOvulationDate.setDate(nextOvulationDate.getDate() + ovulationDayOffset);

    while (nextOvulationDate.getTime() < today.getTime()) {
        nextOvulationDate.setDate(nextOvulationDate.getDate() + cycleLength);
    }

    const daysUntilOvulation = Math.ceil((nextOvulationDate.getTime() - today.getTime()) / MS_PER_DAY);

    if (daysUntilOvulation >= 0) {
        if (daysUntilOvulation === 0) {
            return `🎉 Ovulation is TODAY!`;
        } else {
            return `Next Ovulation in ${daysUntilOvulation} days.`;
        }
    }

    startDateObj.setDate(startDateObj.getDate() - cycleLength);
    let nextPeriodDate = new Date(startDateObj);
    nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLength + periodStartOffset);

    while (nextPeriodDate.getTime() < today.getTime()) {
        nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLength);
    }

    const daysUntilPeriod = Math.ceil((nextPeriodDate.getTime() - today.getTime()) / MS_PER_DAY);

    if (daysUntilPeriod >= 0) {
        if (daysUntilPeriod === 0) {
            return `🩸 Period is TODAY (Predicted)!`;
        } else {
            return `Next Predicted Period in ${daysUntilPeriod} days.`;
        }
    }

    return `⚠️ You should have your period now. Please mark the Start Date.`;
}
