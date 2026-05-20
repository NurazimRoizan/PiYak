'use client';

import { useState, useEffect } from 'react';
import { useTracker } from '@/hooks/useTracker';
import Calendar from '@/components/Calendar';
import PeriodSetupModal from '@/components/PeriodSetupModal';
import PartnerSetupModal from '@/components/PartnerSetupModal';
import StatusBar from '@/components/StatusBar';

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Home() {
    const tracker = useTracker();
    const [userIdInput, setUserIdInput] = useState('');
    
    // Calendar Date State
    const [currentDate, setCurrentDate] = useState(() => {
        const today = new Date();
        return { month: today.getMonth(), year: today.getFullYear() };
    });
    
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isPeriodSetupOpen, setIsPeriodSetupOpen] = useState(false);
    const [isPartnerSetupOpen, setIsPartnerSetupOpen] = useState(false);

    // Initial selected date
    useEffect(() => {
        const today = new Date();
        const monthStr = String(today.getMonth() + 1).padStart(2, '0');
        const dayStr = String(today.getDate()).padStart(2, '0');
        setSelectedDate(`${today.getFullYear()}-${monthStr}-${dayStr}`);
    }, []);

    // Handle switching mode with period setup prompt
    const handleToggleMode = () => {
        if (tracker.appMode === 'counter') {
            const hasSettings = localStorage.getItem('periodSettings');
            if (!hasSettings) {
                setIsPeriodSetupOpen(true);
            } else {
                tracker.toggleAppMode();
            }
        } else {
            tracker.toggleAppMode();
        }
    };

    const handleSaveUserId = () => {
        if (userIdInput.trim()) {
            tracker.login(userIdInput.trim());
        } else {
            alert('Please enter a valid User ID.');
        }
    };

    const handleActionClick = (action: string | number) => {
        if (!selectedDate) return alert('Select a date first.');
        tracker.updateCounterAndSubmit(selectedDate, action);
    };

    if (tracker.isLoading && tracker.userId) {
        return (
            <div className="fixed inset-0 bg-black z-[100] flex justify-center items-center">
                <div className="relative w-full max-w-[500px] aspect-[9/16] max-h-screen">
                    <img 
                        src="/images/loader.PNG" 
                        alt="Loading PiYak..." 
                        className="absolute inset-0 w-full h-full object-cover object-center" 
                    />
                    {/* The animated progress bar perfectly scaled */}
                    <div className="absolute bottom-[39%] left-[14%] w-[72%] h-[6%] bg-transparent rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                        <div className="w-full h-full poop-bar-animated rounded-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!tracker.userId) {
        return (
            <div className="w-[calc(100%-56px)] max-w-[700px] mx-auto p-8 mt-10 bg-white text-black border-4 border-black shadow-[8px_8px_0_0_#00FFFF] text-center">
                <h2 className="text-3xl mb-6 font-extrabold uppercase">👋 Welcome!</h2>
                <input 
                    type="text" 
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    placeholder="Enter your name or ID"
                    className="p-3 mb-6 w-[80%] max-w-[300px] bg-black text-white border-4 border-black font-bold uppercase placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-period-start"
                />
                <br />
                <button 
                    onClick={handleSaveUserId}
                    className="bg-period-fertile text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none py-3 px-8 font-extrabold uppercase transition-all"
                >
                    Start Tracking
                </button>
            </div>
        );
    }

    const todayDateStr = new Date().toLocaleDateString('en-GB', { month: 'long', day: 'numeric' });
    const weekDayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long' });

    return (
        <div className="w-[calc(100%-56px)] max-w-[700px] mx-auto p-6 my-8 bg-black border-4 border-white shadow-[12px_12px_0_0_#FF00FF]">
            <p className="text-xl font-bold uppercase tracking-widest text-piyak-highlight mb-1">{todayDateStr}</p>
            <h1 className="text-4xl font-extrabold mb-4 uppercase text-white">{weekDayStr}</h1>
            
            <StatusBar 
                appMode={tracker.appMode}
                isPartnerView={tracker.isPartnerView}
                periodStartDate={tracker.periodStartDate}
                periodSettings={tracker.periodSettings}
                dailyCounts={tracker.dailyCounts}
            />

            <div className="text-center my-6 flex flex-col items-center gap-3">
                <div className="text-lg font-bold uppercase tracking-wide">
                    Mode: <span className="bg-white text-black px-2 border-2 border-white ml-2">{tracker.appMode === 'period' ? 'BLOOD' : 'POOP'}</span>
                </div>
                
                {!tracker.isPartnerView && (
                    <div className="flex gap-4">
                        <button 
                            onClick={handleToggleMode}
                            className="px-4 py-2 bg-piyak-highlight text-black border-4 border-white shadow-[4px_4px_0_0_#fff] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#fff] active:translate-x-1 active:translate-y-1 active:shadow-none font-bold uppercase transition-all"
                        >
                            Switch to {tracker.appMode === 'period' ? 'POOP' : 'BLOOD'}
                        </button>
                        
                        {tracker.appMode === 'period' && (
                            <button 
                                onClick={() => setIsPeriodSetupOpen(true)}
                                className="px-4 py-2 bg-period-start text-white border-4 border-white shadow-[4px_4px_0_0_#fff] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#fff] active:translate-x-1 active:translate-y-1 active:shadow-none font-bold uppercase transition-all"
                            >
                                Settings
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="my-6">
                <div className="flex justify-between items-center mb-6 font-extrabold text-2xl uppercase border-4 border-white bg-black p-2 shadow-[4px_4px_0_0_#00FFFF]">
                    <button 
                        onClick={() => setCurrentDate(prev => prev.month === 0 ? { month: 11, year: prev.year - 1 } : { ...prev, month: prev.month - 1 })}
                        className="px-4 py-1 text-piyak-highlight hover:bg-white hover:text-black transition-colors cursor-pointer border-r-4 border-transparent hover:border-white"
                    >
                        &lt;
                    </button>
                    <span>{months[currentDate.month]} {currentDate.year}</span>
                    <button 
                        onClick={() => setCurrentDate(prev => prev.month === 11 ? { month: 0, year: prev.year + 1 } : { ...prev, month: prev.month + 1 })}
                        className="px-4 py-1 text-piyak-highlight hover:bg-white hover:text-black transition-colors cursor-pointer border-l-4 border-transparent hover:border-white"
                    >
                        &gt;
                    </button>
                </div>

                <Calendar 
                    month={currentDate.month}
                    year={currentDate.year}
                    appMode={tracker.appMode}
                    dailyCounts={tracker.dailyCounts}
                    dailyStatuses={tracker.dailyStatuses}
                    periodSettings={tracker.periodSettings}
                    periodStartDate={tracker.periodStartDate}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                />
            </div>

            {/* Action Buttons */}
            {!tracker.isPartnerView && (
                <div className="flex flex-wrap justify-center gap-4 mb-8 mt-4">
                    <button 
                        onClick={() => handleActionClick(tracker.appMode === 'period' ? 'start' : 1)}
                        className="bg-piyak-selection text-black border-4 border-white shadow-[4px_4px_0_0_#fff] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#fff] active:translate-x-1 active:translate-y-1 active:shadow-none px-6 py-3 font-extrabold uppercase transition-all"
                    >
                        {tracker.appMode === 'period' ? 'Start 🩸' : 'Pooped! 💩'}
                    </button>
                    <button 
                        onClick={() => handleActionClick(tracker.appMode === 'period' ? 'end' : -1)}
                        className="bg-period-start text-white border-4 border-white shadow-[4px_4px_0_0_#fff] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#fff] active:translate-x-1 active:translate-y-1 active:shadow-none px-6 py-3 font-extrabold uppercase transition-all"
                    >
                        {tracker.appMode === 'period' ? 'End ✅' : 'Mistake! 🙈'}
                    </button>
                    {tracker.appMode === 'period' && (
                        <button 
                            onClick={() => handleActionClick('clear')}
                            className="bg-black text-white border-4 border-white shadow-[4px_4px_0_0_#fff] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#fff] active:translate-x-1 active:translate-y-1 active:shadow-none px-6 py-3 font-extrabold uppercase transition-all"
                        >
                            Clear 🗑️
                        </button>
                    )}
                </div>
            )}

            {/* Footer Actions */}
            <div className="mt-8 border-t-4 border-white pt-6 flex flex-col gap-4">
                <div className="flex gap-4 justify-center">
                    {!tracker.isPartnerView && (
                        <button 
                            onClick={() => {
                                if (confirm('Are you sure you want to reset the saved User ID? You will need to re-enter it next time.')) {
                                    tracker.logout();
                                }
                            }}
                            className="bg-black text-period-start border-2 border-period-start px-4 py-2 font-bold uppercase hover:bg-period-start hover:text-white transition-colors"
                        >
                            Reset ID
                        </button>
                    )}
                    
                    {tracker.isPartnerView && (
                        <button 
                            onClick={() => setIsPartnerSetupOpen(true)}
                            className="bg-piyak-highlight text-black border-2 border-white font-bold px-4 py-2 uppercase hover:bg-white transition-colors"
                        >
                            Change Partner
                        </button>
                    )}
                </div>

                <div className="flex justify-between items-center text-sm opacity-90 mt-2">
                    <span>
                        {tracker.isPartnerView ? `Viewing Partner: ${tracker.partnerId}` : `Currently logged-in as ${tracker.userId}`}
                    </span>
                    
                    <button 
                        onClick={() => {
                            if (!tracker.partnerId && !tracker.isPartnerView) {
                                setIsPartnerSetupOpen(true);
                            } else {
                                tracker.togglePartnerView();
                            }
                        }}
                        className="text-[#8c9eff] hover:text-[#a0b0ff] underline bg-transparent border-none cursor-pointer"
                    >
                        {tracker.isPartnerView 
                            ? "Back to My Calendar" 
                            : (tracker.partnerId ? "View Partner's Calendar" : "Connect with a Partner")}
                    </button>
                </div>
            </div>

            {/* Modals */}
            <PeriodSetupModal 
                isOpen={isPeriodSetupOpen}
                initialSettings={tracker.periodSettings}
                onSave={(settings) => {
                    tracker.savePeriodSettings(settings);
                    setIsPeriodSetupOpen(false);
                }}
            />
            
            <PartnerSetupModal 
                isOpen={isPartnerSetupOpen}
                currentUserId={tracker.userId}
                onSave={(pId) => {
                    tracker.connectPartner(pId);
                    setIsPartnerSetupOpen(false);
                    alert(`Partner ${pId} connected! Enjoy spying on each others.`);
                }}
                onCancel={() => setIsPartnerSetupOpen(false)}
            />
        </div>
    );
}
