'use client';

import { useState, useEffect } from 'react';
import { useTracker } from '@/hooks/useTracker';
import Calendar from '@/components/Calendar';
import PeriodSetupModal from '@/components/PeriodSetupModal';
import PartnerSetupModal from '@/components/PartnerSetupModal';
import StatusBar from '@/components/StatusBar';
import { useAuth, useUser, SignInButton, UserButton } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Home() {
    const { userId } = useAuth();
    const { user: currentUser } = useUser();
    const tracker = useTracker();
    const currentUsername = currentUser?.username || currentUser?.firstName || "User";
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

    const handleActionClick = (action: string | number) => {
        if (!selectedDate) return alert('Select a date first.');
        tracker.toggleStatus(selectedDate, action);
    };

    if (tracker.isLoading && userId) {
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

    if (!userId) {
        return (
            <div className="w-[calc(100%-56px)] max-w-[700px] mx-auto p-8 mt-10 bg-white text-black border-4 border-black shadow-[8px_8px_0_0_#00FFFF] text-center">
                <h2 className="text-3xl mb-6 font-extrabold uppercase">👋 Welcome to PiYak!</h2>
                <p className="mb-6 font-bold uppercase">Please sign in to access your secure tracker.</p>
                <SignInButton mode="modal">
                    <button className="bg-piyak-highlight text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none py-3 px-8 font-extrabold uppercase transition-all">
                        Sign In / Register
                    </button>
                </SignInButton>
            </div>
        );
    }

    const todayDateStr = new Date().toLocaleDateString('en-GB', { month: 'long', day: 'numeric' });
    const weekDayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long' });

    return (
        <div className="w-[calc(100%-56px)] max-w-[700px] mx-auto p-6 my-8 bg-black border-4 border-white shadow-[12px_12px_0_0_#FF00FF]">
            <div className="flex justify-between items-start mb-1">
                <p className="text-xl font-bold uppercase tracking-widest text-piyak-highlight">{todayDateStr}</p>
                <div className="border-4 border-black p-1 bg-white shadow-[4px_4px_0_0_#FF00FF] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#FF00FF] transition-transform rotate-[3deg] hover:rotate-0">
                    <UserButton 
                        appearance={{ 
                            baseTheme: dark,
                            elements: { userButtonAvatarBox: "w-8 h-8 rounded-none border-2 border-black" } 
                        }} 
                    />
                </div>
            </div>
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
                <div className="flex justify-between items-center gap-4 text-base mt-2">
                    <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="truncate font-bold text-gray-200 text-lg">
                            {tracker.isPartnerView ? `🕵️ Snooping on: ${tracker.partnerUsername || 'Partner'}` : `👤 Logged in as: ${currentUsername}`}
                        </span>
                        {tracker.isPartnerView ? (
                            <div className="flex gap-4 mt-2">
                                <button 
                                    onClick={() => tracker.togglePartnerView()}
                                    className="bg-white text-black border-2 border-black shadow-[2px_2px_0_0_#00FFFF] hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#00FFFF] px-3 py-1 text-xs uppercase font-extrabold transition-transform"
                                >
                                    Back to Me
                                </button>
                                <button 
                                    onClick={() => setIsPartnerSetupOpen(true)}
                                    className="text-left text-piyak-highlight hover:text-white underline bg-transparent border-none cursor-pointer text-xs uppercase font-bold self-center"
                                >
                                    Change Partner
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsPartnerSetupOpen(true)}
                                className="text-left text-[#8c9eff] hover:text-[#a0b0ff] underline bg-transparent border-none cursor-pointer text-xs uppercase font-bold mt-1"
                            >
                                Setup Partner
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center">
                        {tracker.partnerId ? (
                            <div 
                                onClick={() => !tracker.isPartnerView && tracker.togglePartnerView()}
                                className={`relative group w-12 h-12 bg-white border-4 border-black p-1 shadow-[4px_4px_0_0_#00FFFF] flex justify-center items-center overflow-hidden rotate-[5deg] ${!tracker.isPartnerView ? 'cursor-pointer hover:rotate-12 hover:-translate-y-1 transition-transform' : ''}`}
                            >
                                {tracker.partnerImageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={tracker.partnerImageUrl} alt="Partner" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-[#FF00FF] flex justify-center items-center text-white font-extrabold text-xl">
                                        {(tracker.partnerUsername?.[0] || '?').toUpperCase()}
                                    </div>
                                )}
                                {/* Tape effect */}
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-3 bg-white/50 backdrop-blur-sm border border-gray-300 rotate-[-10deg]"></div>
                                
                                {!tracker.isPartnerView && (
                                     <div className="absolute -bottom-1 -right-1 bg-black text-white border border-white px-1 text-[8px] font-bold rotate-[-15deg]">
                                         VIEW
                                     </div>
                                )}
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsPartnerSetupOpen(true)}
                                className="bg-[#FFFF00] text-black border-4 border-black px-4 py-2 font-extrabold uppercase shadow-[4px_4px_0_0_#FF00FF] rotate-[3deg] text-xs whitespace-nowrap hover:-translate-y-1 transition-transform active:translate-y-1 active:shadow-none"
                            >
                                🔗 Connect
                            </button>
                        )}
                    </div>
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
                inviteCode={tracker.inviteCode}
                onSave={async (code) => {
                    const success = await tracker.connectPartner(code);
                    if (success) {
                        setIsPartnerSetupOpen(false);
                        alert(`Partner connected! Enjoy spying on each others.`);
                    }
                    return success;
                }}
                onCancel={() => setIsPartnerSetupOpen(false)}
                onDisconnect={() => {
                    tracker.disconnectPartner();
                    setIsPartnerSetupOpen(false);
                    alert("Disconnected from partner.");
                }}
            />
        </div>
    );
}
