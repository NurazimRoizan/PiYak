import { ACHIEVEMENTS, AchievementCode } from '@/utils/achievementsData';
import { useEffect, useState } from 'react';

interface TrophyRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    partnerId?: string | null;
}

export default function TrophyRoomModal({ isOpen, onClose, partnerId }: TrophyRoomModalProps) {
    const [myUnlocked, setMyUnlocked] = useState<AchievementCode[]>([]);
    const [partnerUnlocked, setPartnerUnlocked] = useState<AchievementCode[]>([]);
    const [activeTab, setActiveTab] = useState<'me' | 'partner'>('me');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        const fetchAchievements = async () => {
            setIsLoading(true);
            try {
                const resMe = await fetch('/api/achievements');
                const dataMe = await resMe.json();
                if (dataMe.unlockedCodes) setMyUnlocked(dataMe.unlockedCodes);

                if (partnerId) {
                    const resPartner = await fetch(`/api/achievements?partnerId=${partnerId}`);
                    const dataPartner = await resPartner.json();
                    if (dataPartner.unlockedCodes) setPartnerUnlocked(dataPartner.unlockedCodes);
                }
            } catch (err) {
                console.error("Failed to fetch achievements", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAchievements();
    }, [isOpen, partnerId]);

    if (!isOpen) return null;

    const displayedCodes = activeTab === 'me' ? myUnlocked : partnerUnlocked;
    const unlockedSet = new Set(displayedCodes);

    return (
        <div className="fixed inset-0 bg-black/80 z-[200] flex justify-center items-center p-4 overflow-y-auto">
            <div className="bg-black border-4 border-white shadow-[12px_12px_0_0_#FFFF00] w-full max-w-3xl max-h-[90vh] flex flex-col relative my-8">
                {/* Header */}
                <div className="bg-white text-black p-4 border-b-4 border-black flex justify-between items-center">
                    <h2 className="text-3xl font-extrabold uppercase tracking-widest">🏆 Trophies</h2>
                    <button onClick={onClose} className="text-2xl font-bold hover:text-[#FF00FF] hover:scale-125 transition-transform">
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                {partnerId && (
                    <div className="flex border-b-4 border-white bg-black">
                        <button 
                            onClick={() => setActiveTab('me')}
                            className={`flex-1 py-3 font-extrabold uppercase text-lg transition-colors border-r-4 border-white ${activeTab === 'me' ? 'bg-[#FF00FF] text-white shadow-[inset_0_-4px_0_0_#000]' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                            Me
                        </button>
                        <button 
                            onClick={() => setActiveTab('partner')}
                            className={`flex-1 py-3 font-extrabold uppercase text-lg transition-colors ${activeTab === 'partner' ? 'bg-[#00FFFF] text-black shadow-[inset_0_-4px_0_0_#000]' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                            Partner
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto bg-piyak-bg flex-1">
                    {isLoading ? (
                        <div className="text-center font-bold text-xl uppercase animate-pulse">Loading Treasures...</div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                            {Object.values(ACHIEVEMENTS).map((ach) => {
                                const isUnlocked = unlockedSet.has(ach.code);
                                
                                return (
                                    <div 
                                        key={ach.code} 
                                        className={`border-4 p-4 flex flex-col items-center text-center transition-all duration-300 ${isUnlocked ? 'border-white bg-black hover:-translate-y-2' : 'border-dashed border-gray-600 bg-black/50 opacity-60 grayscale'}`}
                                        style={isUnlocked ? { boxShadow: `6px 6px 0 0 ${ach.color}` } : {}}
                                    >
                                        <div className="text-5xl mb-3 drop-shadow-md">{ach.icon}</div>
                                        <h3 className={`font-extrabold uppercase text-sm mb-1 ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                                            {ach.title}
                                        </h3>
                                        <p className="text-xs text-gray-300 font-medium">
                                            {isUnlocked ? ach.description : '???'}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
