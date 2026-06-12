import { useState, useEffect, useMemo } from 'react';

interface YakWrappedModalProps {
    isOpen: boolean;
    onClose: () => void;
    dailyCounts: Record<string, number>;
    dailyStatuses: Record<string, string>;
}

const slideColors = [
    'bg-[#FF00FF]', // Magenta
    'bg-[#00FFFF]', // Cyan
    'bg-[#FFFF00]', // Yellow
    'bg-[#FF0000]', // Red
    'bg-[#00FF00]', // Green
];

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function YakWrappedModal({ isOpen, onClose, dailyCounts, dailyStatuses }: YakWrappedModalProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const stats = useMemo(() => {
        const today = new Date();
        // Calculate for the previous month
        const targetDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const targetYear = targetDate.getFullYear();
        const targetMonth = targetDate.getMonth();
        const monthName = monthNames[targetMonth];
        
        let totalPoops = 0;
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];
        let totalPeriodDays = 0;
        let activePoopDays = 0;
        let doubleDropDays = 0;

        Object.entries(dailyCounts).forEach(([dateStr, count]) => {
            const d = new Date(dateStr);
            if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
                totalPoops += count;
                dayCounts[d.getUTCDay()] += count;
                if (count > 0) activePoopDays++;
                if (count >= 2) doubleDropDays++;
            }
        });

        Object.entries(dailyStatuses).forEach(([dateStr, status]) => {
            const d = new Date(dateStr);
            if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
                if (['start', 'flow', 'end'].includes(status)) {
                    totalPeriodDays += 1;
                }
            }
        });

        let maxDayIdx = 0;
        for (let i = 1; i < 7; i++) {
            if (dayCounts[i] > dayCounts[maxDayIdx]) {
                maxDayIdx = i;
            }
        }

        const estimatedHours = (totalPoops * 12) / 60; // 12 mins per poop
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const zeroDays = daysInMonth - activePoopDays;

        let statusTitle = '';
        let statusDesc = '';
        if (totalPoops === 0) {
            statusTitle = 'ETHEREAL ENTITY';
            statusDesc = 'Holding onto earthly matter with a terrifying, iron grip.';
        } else if (totalPoops <= 5) {
            statusTitle = 'DORMANT VOLCANO';
            statusDesc = 'Barely participating in the global carbon cycle.';
        } else if (totalPoops <= 15) {
            statusTitle = 'FACTORY SETTINGS';
            statusDesc = 'A perfectly average meat-sack fulfilling its biological quota.';
        } else if (totalPoops <= 30) {
            statusTitle = 'GRAVITY DISTORTION';
            statusDesc = 'Shedding mass at an alarming velocity. You are a biological hazard.';
        } else {
            statusTitle = 'PRIMORDIAL CHAOS';
            statusDesc = 'Local plumbing infrastructure weeps at your approach.';
        }

        return {
            monthName,
            totalPoops,
            favoriteDay: dayNames[maxDayIdx],
            estimatedHours: estimatedHours.toFixed(1),
            totalPeriodDays,
            zeroDays,
            doubleDropDays,
            statusTitle,
            statusDesc
        };
    }, [dailyCounts, dailyStatuses]);

    // Reset slide when opened
    useEffect(() => {
        if (isOpen) {
            setCurrentSlide(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const slides = [
        {
            title: "YAK WRAPPED",
            content: `Your ${stats.monthName} Recap is here.`,
            icon: "🎁",
            textColor: "text-white"
        },
        {
            title: "PAYLOADS DROPPED",
            content: `You dropped ${stats.totalPoops} payloads this month!`,
            icon: "💩",
            textColor: "text-black",
            sticker: `STATUS: ${stats.statusTitle}`,
            subtext: stats.statusDesc
        },
        {
            title: "FAVORITE DAY",
            content: `Your most active day was ${stats.favoriteDay}!`,
            icon: "📅",
            textColor: "text-black"
        },
        {
            title: "TIME WELL SPENT",
            content: `You spent an estimated ${stats.estimatedHours} hours on the toilet.`,
            icon: "⏳",
            textColor: "text-black",
            subtext: "(Assuming 12 mins per drop. Your boss would be proud.)"
        },
        {
            title: "TITANIUM BOWELS",
            content: `You held it in for ${stats.zeroDays} days this month.`,
            icon: "🧱",
            textColor: "text-white",
            subtext: "Your sphincter control is terrifying."
        }
    ];

    if (stats.doubleDropDays > 0) {
        slides.push({
            title: "OVERDRIVE MODE",
            content: `You went 2+ times on ${stats.doubleDropDays} different days!`,
            icon: "🚀",
            textColor: "text-black",
            subtext: "Maximum efficiency achieved."
        });
    }

    if (stats.totalPeriodDays > 0) {
        slides.push({
            title: "CRIMSON TIDE",
            content: `You spent ${stats.totalPeriodDays} days on your period.`,
            icon: "🩸",
            textColor: "text-white",
            subtext: "You survived the red wedding."
        });
    }

    slides.push({
        title: "YOU SURVIVED.",
        content: "See you next month.",
        icon: "👑",
        textColor: "text-black"
    });

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };

    const slide = slides[currentSlide];
    const bgColor = slideColors[currentSlide % slideColors.length];

    return (
        <div className="fixed inset-0 bg-black/90 z-[300] flex justify-center items-center p-4">
            <div className={`relative w-full max-w-sm aspect-[9/16] ${bgColor} border-8 border-white shadow-[16px_16px_0_0_#000] flex flex-col justify-center items-center p-8 text-center transition-colors duration-500 overflow-hidden`}>
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-black text-white w-10 h-10 border-4 border-white font-extrabold text-xl hover:scale-110 active:scale-95 transition-transform z-10"
                >
                    ✕
                </button>

                {/* Progress Indicators */}
                <div className="absolute top-4 left-4 right-16 flex gap-2 z-10">
                    {slides.map((_, idx) => (
                        <div key={idx} className={`flex-1 h-2 border-2 border-black ${idx <= currentSlide ? 'bg-white' : 'bg-black/20'}`} />
                    ))}
                </div>

                {/* Content */}
                <div key={currentSlide} className="animate-in fade-in slide-in-from-bottom-8 duration-500 flex flex-col items-center">
                    <div className="text-8xl mb-8 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] animate-bounce">
                        {slide.icon}
                    </div>
                    
                    <h2 className={`text-4xl font-extrabold uppercase tracking-widest mb-6 ${slide.textColor} drop-shadow-[2px_2px_0_rgba(0,0,0,1)]`}>
                        {slide.title}
                    </h2>
                    
                    <p className={`text-2xl font-bold uppercase ${slide.textColor} leading-tight`}>
                        {slide.content}
                    </p>

                    {slide.sticker && (
                        <div className="mt-6 bg-white text-black font-extrabold uppercase px-3 py-1 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] rotate-[-3deg] text-sm">
                            {slide.sticker}
                        </div>
                    )}

                    {slide.subtext && (
                        <p className={`text-sm font-bold mt-4 ${slide.textColor} opacity-90 uppercase px-4`}>
                            {slide.subtext}
                        </p>
                    )}
                </div>

                {/* Navigation Area - Invisible click zones */}
                <div className="absolute inset-0 flex mt-16">
                    <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
                    <div className="w-2/3 h-full cursor-pointer" onClick={handleNext} />
                </div>
                
                {/* Hint */}
                <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
                    <span className="bg-black text-white px-3 py-1 font-bold uppercase text-xs border-2 border-white">
                        Tap right to continue
                    </span>
                </div>
            </div>
        </div>
    );
}
