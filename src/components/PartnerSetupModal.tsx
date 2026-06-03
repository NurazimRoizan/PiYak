import { useState } from 'react';

interface PartnerSetupModalProps {
    isOpen: boolean;
    inviteCode: string | null;
    onSave: (partnerCode: string) => Promise<boolean>;
    onCancel: () => void;
    onDisconnect: () => void;
}

export default function PartnerSetupModal({ isOpen, inviteCode, onSave, onCancel, onDisconnect }: PartnerSetupModalProps) {
    const [partnerInput, setPartnerInput] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        const code = partnerInput.trim().toUpperCase();
        if (code && code.length === 6) {
            setIsConnecting(true);
            const success = await onSave(code);
            setIsConnecting(false);
            if (success) {
                setPartnerInput('');
            }
        } else {
            alert("Please enter a valid 6-character Invite Code.");
        }
    };

    const handleCopy = () => {
        if (inviteCode) {
            navigator.clipboard.writeText(inviteCode);
            alert("Invite code copied to clipboard!");
        }
    };

    return (
        <div className="fixed top-0 left-0 w-full h-full bg-black/90 z-20 flex justify-center items-start pt-[20%] backdrop-blur-sm">
            <div className="bg-black text-white p-6 w-[90%] max-w-[400px] border-4 border-white shadow-[12px_12px_0_0_#00FFFF]">
                <h3 className="mt-0 text-piyak-highlight text-2xl font-extrabold uppercase mb-2">❤️ Connect Partner</h3>
                
                <div className="mb-6 border-b-2 border-white pb-6">
                    <p className="text-gray-300 text-sm font-bold uppercase mb-2">Your Invite Code:</p>
                    <div className="flex gap-2">
                        <div className="flex-1 p-3 bg-gray-900 border-2 border-gray-600 text-center font-mono text-xl tracking-widest font-bold">
                            {inviteCode || 'Loading...'}
                        </div>
                        <button 
                            onClick={handleCopy}
                            disabled={!inviteCode}
                            className="px-4 py-2 bg-white text-black border-2 border-black font-bold uppercase hover:bg-gray-300 disabled:opacity-50"
                        >
                            Copy
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Share this code with your partner.</p>
                </div>

                <p className="text-gray-300 text-sm font-bold uppercase mb-4">Enter Partner's Code:</p>
                <input 
                    type="text" 
                    value={partnerInput}
                    onChange={(e) => setPartnerInput(e.target.value.toUpperCase())}
                    placeholder="6-CHAR CODE"
                    maxLength={6}
                    className="w-full p-3 mb-6 bg-black text-white border-4 border-white font-mono font-bold uppercase tracking-widest text-center placeholder:text-gray-500 placeholder:tracking-normal focus:outline-none focus:ring-4 focus:ring-piyak-highlight"
                />
                
                <div className="flex justify-between gap-4">
                    {/* Disconnect Button (only show if already connected) */}
                    <button 
                        onClick={onDisconnect}
                        className="px-6 py-3 text-gray-400 font-extrabold uppercase underline hover:text-white transition-colors"
                    >
                        Disconnect
                    </button>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={onCancel}
                            disabled={isConnecting}
                            className="px-6 py-3 bg-white text-black border-4 border-black font-extrabold uppercase hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isConnecting}
                            className="px-6 py-3 bg-piyak-highlight text-black border-4 border-black shadow-[4px_4px_0_0_#fff] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#fff] active:translate-x-1 active:translate-y-1 active:shadow-none font-extrabold uppercase transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                        >
                            {isConnecting ? '...' : 'Connect'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
