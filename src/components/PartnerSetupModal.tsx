import { useState } from 'react';

interface PartnerSetupModalProps {
    isOpen: boolean;
    currentUserId: string | null;
    onSave: (partnerId: string) => void;
    onCancel: () => void;
}

export default function PartnerSetupModal({ isOpen, currentUserId, onSave, onCancel }: PartnerSetupModalProps) {
    const [partnerId, setPartnerId] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        const pId = partnerId.trim();
        if (pId) {
            if (pId === currentUserId) {
                alert("You cannot add yourself as a partner. That's sad!");
                return;
            }
            onSave(pId);
        } else {
            alert("Please enter a valid Partner ID.");
        }
    };

    return (
        <div className="fixed top-0 left-0 w-full h-full bg-black/90 z-20 flex justify-center items-start pt-[20%] backdrop-blur-sm">
            <div className="bg-black text-white p-6 w-[90%] max-w-[400px] border-4 border-white shadow-[12px_12px_0_0_#00FFFF]">
                <h3 className="mt-0 text-piyak-highlight text-2xl font-extrabold uppercase mb-2">❤️ Connect Partner</h3>
                <p className="text-gray-300 text-sm font-bold uppercase mb-4">Enter Partner ID:</p>
                
                <input 
                    type="text" 
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    placeholder="Partner ID"
                    className="w-full p-3 mb-6 bg-black text-white border-4 border-white font-bold uppercase placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-piyak-highlight"
                />
                
                <div className="flex justify-end gap-4">
                    <button 
                        onClick={onCancel}
                        className="px-6 py-3 bg-white text-black border-4 border-black font-extrabold uppercase hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-3 bg-piyak-highlight text-black border-4 border-black shadow-[4px_4px_0_0_#fff] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#fff] active:translate-x-1 active:translate-y-1 active:shadow-none font-extrabold uppercase transition-all"
                    >
                        Connect
                    </button>
                </div>
            </div>
        </div>
    );
}
