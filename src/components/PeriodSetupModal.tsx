import { useState, useEffect } from 'react';
import { PeriodSettings } from '@/utils/types';

interface PeriodSetupModalProps {
    isOpen: boolean;
    initialSettings: PeriodSettings;
    onSave: (settings: PeriodSettings) => void;
}

export default function PeriodSetupModal({ isOpen, initialSettings, onSave }: PeriodSetupModalProps) {
    const [periodLength, setPeriodLength] = useState(initialSettings.periodLength);
    const [cycleLength, setCycleLength] = useState(initialSettings.cycleLength);

    useEffect(() => {
        setPeriodLength(initialSettings.periodLength);
        setCycleLength(initialSettings.cycleLength);
    }, [initialSettings]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (periodLength >= 3 && cycleLength >= 20) {
            onSave({ periodLength, cycleLength });
        } else {
            alert("Please enter valid lengths (Period >= 3, Cycle >= 20).");
        }
    };

    return (
        <div className="fixed top-0 left-0 w-full h-full bg-black/80 z-[150] flex justify-center items-start pt-[10%] backdrop-blur-sm">
            <div className="bg-[#FFFF00] text-black p-8 w-[90%] max-w-[400px] border-8 border-black shadow-[16px_16px_0_0_#FF00FF] rotate-[2deg]">
                {/* Tape element */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-white/70 backdrop-blur-md border border-gray-400 rotate-[-4deg]"></div>

                <h3 className="mt-2 text-black text-3xl font-black mb-6 uppercase tracking-tighter">⚙️ CYCLE SETUP</h3>

                <label htmlFor="periodLength" className="block mt-4 text-black font-extrabold uppercase text-sm border-b-2 border-black pb-1">
                    1. Period Length (days)
                </label>
                <input 
                    type="number" 
                    id="periodLength" 
                    value={periodLength} 
                    onChange={(e) => setPeriodLength(parseInt(e.target.value))}
                    min="3" 
                    max="15"
                    className="w-full p-4 mt-2 bg-white text-black border-4 border-black font-bold focus:outline-none focus:ring-0 focus:border-[#FF00FF] shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] transition-shadow text-xl"
                />

                <label htmlFor="cycleLength" className="block mt-6 text-black font-extrabold uppercase text-sm border-b-2 border-black pb-1">
                    2. Cycle Length (days)
                </label>
                <input 
                    type="number" 
                    id="cycleLength" 
                    value={cycleLength} 
                    onChange={(e) => setCycleLength(parseInt(e.target.value))}
                    min="20" 
                    max="45"
                    className="w-full p-4 mt-2 bg-white text-black border-4 border-black font-bold focus:outline-none focus:ring-0 focus:border-[#FF00FF] shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] transition-shadow text-xl"
                />

                <button 
                    onClick={handleSave}
                    className="w-full p-5 mt-8 bg-black text-white border-4 border-black shadow-[6px_6px_0_0_#FF00FF] hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#FF00FF] active:translate-x-1 active:translate-y-1 active:shadow-none font-black text-xl uppercase transition-all"
                >
                    SAVE & START
                </button>
            </div>
        </div>
    );
}
