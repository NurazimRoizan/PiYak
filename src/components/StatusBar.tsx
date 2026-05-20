import { AppMode, PeriodSettings } from '@/utils/types';
import { calculatePoopStreak, getPoopStatusMessage } from '@/utils/poopLogic';
import { calculateNextOvulation } from '@/utils/periodLogic';
import { getDateKey } from '@/utils/dateUtils';
import { useMemo } from 'react';

interface StatusBarProps {
    appMode: AppMode;
    isPartnerView: boolean;
    periodStartDate: string | null;
    periodSettings: PeriodSettings;
    dailyCounts: Record<string, number>;
}

export default function StatusBar({
    appMode, isPartnerView, periodStartDate, periodSettings, dailyCounts
}: StatusBarProps) {
    const statusText = useMemo(() => {
        if (isPartnerView) {
            return "Viewing Partner's Calendar (Read Only)";
        }

        if (appMode === 'counter') {
            const today = new Date();
            const streak = calculatePoopStreak(today, dailyCounts);
            const countToday = dailyCounts[getDateKey(today.getFullYear(), today.getMonth(), today.getDate())] || 0;
            return getPoopStatusMessage(streak, countToday);
        } else {
            return calculateNextOvulation(periodStartDate, periodSettings);
        }
    }, [appMode, isPartnerView, periodStartDate, periodSettings, dailyCounts]);

    return (
        <div className="mt-6 p-4 bg-white text-black border-4 border-black shadow-[6px_6px_0_0_#00FFFF] text-center font-extrabold uppercase tracking-widest text-lg transform -rotate-1 hover:rotate-0 transition-transform cursor-default">
            {appMode === 'period' ? '🩸 ' : '💩 '}
            {statusText}
        </div>
    );
}
