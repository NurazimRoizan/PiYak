'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface UserData {
    id: string;
    name: string;
    recordCount: number;
    achievementCount: number;
    partnerId: string | null;
    appMode: string;
}

export default function MigratePage() {
    const { userId, isLoaded } = useAuth();
    const { user } = useUser();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMigrating, setIsMigrating] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    useEffect(() => {
        if (isLoaded && userId) {
            fetch('/api/admin-migrate')
                .then(res => {
                    if (!res.ok) throw new Error('Failed to load accounts');
                    return res.json();
                })
                .then(data => {
                    setUsers(data.users || []);
                    setLoading(false);
                })
                .catch(err => {
                    setStatus({ type: 'error', message: 'Failed to load accounts from database.' });
                    setLoading(false);
                });
        }
    }, [isLoaded, userId]);

    const handleMigrate = async (oldId: string, oldName: string, records: number) => {
        if (!confirm(`Are you sure you want to migrate all data from ${oldName} (${records} records) to your current logged-in account?`)) {
            return;
        }

        setIsMigrating(true);
        setStatus({ type: 'info', message: 'Migrating historical records, achievements, and partner links... Please wait.' });

        try {
            const res = await fetch('/api/admin-migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldId })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setStatus({ 
                    type: 'success', 
                    message: '🎉 Migration complete! All historical poops, period logs, achievements, and partner connections have been successfully transferred to your new account.' 
                });
                setUsers(prev => prev.filter(u => u.id !== oldId));
            } else {
                setStatus({ type: 'error', message: 'Migration failed: ' + (data.error || 'Unknown error') });
            }
        } catch (e: any) {
            setStatus({ type: 'error', message: 'Migration failed: ' + e.message });
        } finally {
            setIsMigrating(false);
        }
    };

    if (!isLoaded || loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">
                <div className="border-4 border-white p-6 bg-black shadow-[8px_8px_0_0_#FF00FF]">
                    <div className="text-xl font-bold animate-pulse">Loading Accounts...</div>
                </div>
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
                <div className="border-4 border-white p-8 bg-black shadow-[8px_8px_0_0_#FF0000] text-center max-w-md">
                    <h1 className="text-2xl font-black uppercase mb-4 text-[#FF0000]">Authentication Required</h1>
                    <p className="font-bold mb-6">Please log in to your NEW account before visiting the migration page.</p>
                    <Link href="/" className="bg-[#FFFF00] text-black font-extrabold px-6 py-3 border-2 border-black inline-block uppercase shadow-[4px_4px_0_0_#FFF]">
                        Go To Home / Login
                    </Link>
                </div>
            </div>
        );
    }

    const currentAccountLabel = user?.username || user?.firstName || user?.emailAddresses[0]?.emailAddress || userId;

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans pb-24">
            <div className="max-w-2xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="border-4 border-white p-6 bg-black shadow-[8px_8px_0_0_#FFFF00] rotate-[-1deg]">
                    <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white mb-2">
                        Account Migration Tool
                    </h1>
                    <p className="font-bold text-gray-300 text-sm sm:text-base">
                        Transfer all historical poops, period logs, achievements, and partner links from your old account to your new account with zero data loss.
                    </p>
                </div>

                {/* Current Active Account Box */}
                <div className="border-4 border-white p-5 bg-[#00FFFF] text-black shadow-[6px_6px_0_0_#FF00FF]">
                    <div className="text-xs font-black uppercase tracking-widest mb-1 text-black/70">
                        Target Account (Logged in now)
                    </div>
                    <div className="text-xl font-black">{currentAccountLabel}</div>
                    <code className="text-xs font-mono break-all block mt-1 text-black/80 font-bold">{userId}</code>
                </div>

                {/* Status Message */}
                {status && (
                    <div className={`border-4 border-black p-5 shadow-[6px_6px_0_0_#FFF] font-bold ${
                        status.type === 'success' 
                            ? 'bg-[#00FF66] text-black' 
                            : status.type === 'error' 
                            ? 'bg-[#FF0000] text-white' 
                            : 'bg-[#FFFF00] text-black'
                    }`}>
                        <div className="text-base sm:text-lg">{status.message}</div>
                        {status.type === 'success' && (
                            <div className="mt-4">
                                <Link 
                                    href="/"
                                    className="bg-black text-white border-2 border-black px-6 py-2 font-black uppercase inline-block shadow-[4px_4px_0_0_#FFF] hover:-translate-y-1 transition-all"
                                >
                                    Open PiYak Tracker 💩
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* Accounts List */}
                <div className="space-y-4 pt-4">
                    <h2 className="text-xl font-black uppercase tracking-wide text-[#FFFF00]">
                        Select Old Account to Migrate
                    </h2>
                    <p className="text-xs text-gray-400 font-bold uppercase">
                        Look for the account below with your historical record count, then click &quot;Migrate to Current Account&quot;.
                    </p>

                    {users.map(u => {
                        const isCurrent = u.id === userId;

                        return (
                            <div 
                                key={u.id}
                                className={`border-4 border-white p-5 bg-black transition-all ${
                                    isCurrent 
                                        ? 'opacity-60 shadow-[4px_4px_0_0_#555]' 
                                        : 'shadow-[8px_8px_0_0_#FF00FF] hover:-translate-y-1'
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg font-black text-white">{u.name}</span>
                                            {isCurrent && (
                                                <span className="bg-[#00FF66] text-black text-xs font-black px-2 py-0.5 uppercase border border-black">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <code className="text-xs font-mono text-gray-400 break-all block">{u.id}</code>
                                        
                                        <div className="flex gap-4 mt-3 text-sm font-black">
                                            <span className="text-[#00FFFF]">💩 Records: {u.recordCount}</span>
                                            <span className="text-[#FFFF00]">🏆 Trophies: {u.achievementCount}</span>
                                            {u.partnerId && <span className="text-[#FF00FF]">🔗 Partner Linked</span>}
                                        </div>
                                    </div>

                                    {!isCurrent && (
                                        <div className="sm:shrink-0">
                                            <button
                                                onClick={() => handleMigrate(u.id, u.name, u.recordCount)}
                                                disabled={isMigrating}
                                                className="w-full sm:w-auto bg-[#FF00FF] hover:bg-[#FF33FF] disabled:opacity-50 text-white font-black uppercase text-sm sm:text-base py-3 px-6 border-2 border-white shadow-[4px_4px_0_0_#FFFF00] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                                            >
                                                {isMigrating ? 'Migrating...' : `Migrate ${u.recordCount} Records to ME`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Back to Home Link */}
                <div className="pt-8 text-center">
                    <Link href="/" className="text-gray-400 hover:text-white font-bold text-sm underline uppercase">
                        ← Back to PiYak Home
                    </Link>
                </div>

            </div>
        </div>
    );
}
