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
        <div className="fixed top-0 left-0 w-full h-full bg-black/90 z-20 flex justify-center items-start pt-[10%] backdrop-blur-sm">
            <div className="bg-black text-white p-6 w-[90%] max-w-[400px] border-4 border-white shadow-[12px_12px_0_0_#FF00FF]">
                <h3 className="mt-0 text-period-start text-2xl font-extrabold mb-6 uppercase">🩸 Cycle Setup</h3>

                <label htmlFor="periodLength" className="block mt-4 text-white font-bold uppercase text-sm">
                    1. Period Length (days)
                </label>
                <input 
                    type="number" 
                    id="periodLength" 
                    value={periodLength} 
                    onChange={(e) => setPeriodLength(parseInt(e.target.value))}
                    min="3" 
                    max="15"
                    className="w-full p-3 mt-2 bg-black text-white border-4 border-white font-bold focus:outline-none focus:ring-4 focus:ring-period-start"
                />

                <label htmlFor="cycleLength" className="block mt-6 text-white font-bold uppercase text-sm">
                    2. Cycle Length (days)
                </label>
                <input 
                    type="number" 
                    id="cycleLength" 
                    value={cycleLength} 
                    onChange={(e) => setCycleLength(parseInt(e.target.value))}
                    min="20" 
                    max="45"
                    className="w-full p-3 mt-2 bg-black text-white border-4 border-white font-bold focus:outline-none focus:ring-4 focus:ring-period-start"
                />

                <button 
                    onClick={handleSave}
                    className="w-full p-4 mt-8 bg-period-fertile text-black border-4 border-black shadow-[4px_4px_0_0_#fff] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#fff] active:translate-x-1 active:translate-y-1 active:shadow-none font-extrabold uppercase transition-all"
                >
                    Save & Start
                </button>
            </div>
        </div>
    );
}
