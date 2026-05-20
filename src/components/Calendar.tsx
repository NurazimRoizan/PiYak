import { getPeriodStatus } from '@/utils/periodLogic';
import { AppMode, PeriodSettings } from '@/utils/types';
import { getDateKey } from '@/utils/dateUtils';
import { useMemo } from 'react';

interface CalendarProps {
    month: number;
    year: number;
    appMode: AppMode;
    dailyCounts: Record<string, number>;
    dailyStatuses: Record<string, string>;
    periodSettings: PeriodSettings;
    periodStartDate: string | null;
    selectedDate: string | null;
    onSelectDate: (dateKey: string) => void;
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Calendar({
    month, year, appMode, dailyCounts, dailyStatuses, periodSettings, periodStartDate, selectedDate, onSelectDate
}: CalendarProps) {

    const days = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const daysArray = [];
        
        // Blank days
        for (let i = 0; i < firstDayOfMonth; i++) {
            daysArray.push({ type: 'blank', key: `blank-${i}` });
        }
        
        // Actual days
        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            const dateKey = getDateKey(year, month, i);
            const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            daysArray.push({ type: 'day', day: i, key: dateKey, isToday });
        }
        
        return daysArray;
    }, [month, year]);

    const getDayStyle = (dateKey: string, isToday: boolean, isSelected: boolean) => {
        let classes = "flex items-center justify-center aspect-square text-sm sm:text-base cursor-pointer transition-transform relative border-2 border-transparent font-bold ";
        
        if (appMode === 'period') {
            classes += " hover:-translate-y-1 hover:shadow-[2px_2px_0_0_#FF00FF]";
            const status = getPeriodStatus(dateKey, periodStartDate, periodSettings, dailyStatuses);
            const sheetStatus = dailyStatuses[dateKey];
            
            // Base background
            if (!status && !sheetStatus) {
                classes += " bg-piyak-bg text-piyak-grid-text border-white/20";
            }
            
            if (sheetStatus === 'start') {
                classes += " bg-period-start text-white border-white shadow-[2px_2px_0_0_#fff]";
            } else if (sheetStatus === 'end') {
                classes += " bg-period-end text-white border-white shadow-[2px_2px_0_0_#fff]";
            } else if (sheetStatus === 'flow') {
                classes += " bg-period-flow text-white border-white";
            } else if (status === 'predicted_period') {
                classes += " bg-period-predicted text-period-predicted-text border-dashed border-period-start";
            } else if (status === 'predicted_ovulation') {
                classes += " bg-period-ovulation text-black border-white shadow-[2px_2px_0_0_#fff]";
            } else if (status === 'fertile_window') {
                classes += " bg-period-fertile text-black border-white shadow-[2px_2px_0_0_#fff]";
            }
            
        } else {
            const count = dailyCounts[dateKey] || 0;
            classes += " hover:-translate-y-1 hover:shadow-[2px_2px_0_0_#FFD700]";
            if (count > 0) {
                classes += " text-black border-white shadow-[2px_2px_0_0_#fff]";
                const intensity = Math.min(count, 4);
                if (intensity === 1) classes += " bg-piyak-brown-base";
                if (intensity === 2) classes += " bg-piyak-brown-mid1";
                if (intensity === 3) classes += " bg-piyak-brown-mid2 text-white";
                if (intensity === 4) classes += " bg-piyak-brown-dark text-white";
            } else {
                classes += " bg-piyak-bg text-piyak-grid-text border-white/20";
            }
        }
        
        if (isToday) {
            classes += " !border-piyak-highlight text-piyak-highlight";
        }
        
        if (isSelected) {
            classes += " !border-piyak-selection !shadow-[2px_2px_0_0_#FFFF00] scale-110 z-10";
        }
        
        return classes;
    };

    return (
        <div className="my-5 border-4 border-white bg-piyak-card p-2 sm:p-4 shadow-[6px_6px_0_0_#fff] sm:shadow-[8px_8px_0_0_#fff]">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, i) => (
                    <div key={dayName} className="font-bold text-white py-1 sm:py-2 border-b-4 border-white uppercase tracking-wider text-[10px] sm:text-xs md:text-sm mb-1 sm:mb-2">
                        {/* Show full name on sm+, just 1st letter on tiny mobile */}
                        <span className="hidden sm:inline">{dayName}</span>
                        <span className="inline sm:hidden">{dayName.charAt(0)}</span>
                    </div>
                ))}
                
                {days.map((dayObj) => {
                    if (dayObj.type === 'blank') {
                        return <div key={dayObj.key} className="aspect-square bg-transparent"></div>;
                    }
                    
                    const { key, day, isToday } = dayObj;
                    const isSelected = key === selectedDate;
                    
                    return (
                        <div 
                            key={key} 
                            onClick={() => onSelectDate(key!)}
                            className={getDayStyle(key!, isToday!, isSelected)}
                        >
                            {day}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
