'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function RecoverPage() {
    const { userId, isLoaded } = useAuth();
    const [history, setHistory] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isLoaded && userId) {
            fetch('/api/forensics')
                .then(res => res.json())
                .then(data => {
                    if (data.error) setError(data.error);
                    else setHistory(data);
                    setLoading(false);
                })
                .catch(err => {
                    setError('Failed to load forensics data');
                    setLoading(false);
                });
        }
    }, [isLoaded, userId]);

    if (!isLoaded || loading) return <div className="p-8 text-white">Loading forensics...</div>;
    if (!userId) return <div className="p-8 text-white">Please log in first.</div>;
    if (error) return <div className="p-8 text-red-500 font-bold">{error}</div>;

    const inferredDates = Object.keys(history?.inferredPoops || {}).sort();

    return (
        <div className="min-h-screen bg-black text-white p-6 pb-24 font-sans">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-gray-900 border-4 border-white p-6 shadow-[8px_8px_0_0_#00FFFF]">
                    <h1 className="text-3xl font-extrabold uppercase mb-4 text-white">Data Recovery Tool</h1>
                    <p className="text-gray-300 font-bold">
                        Since Vercel backups are unavailable, we used a forensic method to recover your data. 
                        Every time you logged a poop in July, PiYak sent a push notification to Nyott. 
                        By scanning Nyott's database inbox, we have fully reconstructed your July poop history!
                    </p>
                </div>

                <div className="bg-gray-900 border-4 border-white p-6 shadow-[8px_8px_0_0_#FF00FF]">
                    <h2 className="text-xl font-extrabold uppercase mb-4 text-piyak-highlight">Your Reconstructed July Log</h2>
                    
                    {inferredDates.length === 0 ? (
                        <p className="text-gray-400">No data could be recovered.</p>
                    ) : (
                        <div className="space-y-3">
                            {inferredDates.map(date => (
                                <div key={date} className="flex justify-between items-center border-b-2 border-gray-700 pb-2">
                                    <span className="font-bold text-lg">{date}</span>
                                    <span className="bg-white text-black px-3 py-1 font-extrabold shadow-[2px_2px_0_0_#FFFF00]">
                                        {history.inferredPoops[date]} Poop{history.inferredPoops[date] > 1 ? 's' : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <p className="mt-6 text-sm text-gray-400">
                        You can now go back to the home page calendar and manually tap these dates to restore your data!
                    </p>
                </div>
            </div>
        </div>
    );
}
