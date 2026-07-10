'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function MigratePage() {
    const { userId, isLoaded } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (isLoaded && userId) {
            fetch('/api/admin-migrate')
                .then(res => res.json())
                .then(data => {
                    setUsers(data.users || []);
                    setLoading(false);
                })
                .catch(err => {
                    setStatus('Failed to load users');
                    setLoading(false);
                });
        }
    }, [isLoaded, userId]);

    const handleMigrate = async (oldId: string, newId: string) => {
        if (!confirm(`Are you sure you want to migrate data from ${oldId} to ${newId}?`)) return;
        
        setStatus('Migrating...');
        try {
            const res = await fetch('/api/admin-migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldId, newId })
            });
            const data = await res.json();
            
            if (data.success) {
                setStatus('✅ Migration successful! Please go back to the home page.');
                setUsers(users.filter(u => u.id !== oldId));
            } else {
                setStatus('❌ Error: ' + data.error);
            }
        } catch (e: any) {
            setStatus('❌ Error: ' + e.message);
        }
    };

    if (!isLoaded || loading) return <div className="p-8 text-white">Loading...</div>;
    if (!userId) return <div className="p-8 text-white">Please log in first.</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 pb-24 font-sans">
            <div className="max-w-2xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold">Data Migration Tool</h1>
                
                <div className="bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
                    <p className="text-gray-300 text-sm">
                        Your <strong>NEW Production Clerk ID</strong> is:<br/>
                        <code className="text-pink-400 block mt-1 break-all">{userId}</code>
                    </p>
                </div>

                {status && (
                    <div className="p-4 bg-gray-800 rounded-lg text-center font-medium border border-gray-700">
                        {status}
                    </div>
                )}

                <h2 className="text-xl font-semibold mt-8">Database Accounts</h2>
                <p className="text-sm text-gray-400 mb-4">Find your old account below (it should have a high record count) and click Migrate. You can also paste your partner's NEW Clerk ID into the box if you want to migrate their data for them.</p>

                <div className="space-y-4">
                    {users.map(u => (
                        <div key={u.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-400">Account ID:</p>
                                    <p className="font-mono text-sm break-all">{u.id}</p>
                                    <p className="text-sm mt-1">Records: <span className="font-bold text-pink-400">{u.recordCount}</span></p>
                                </div>
                            </div>
                            
                            {u.id === userId ? (
                                <div className="text-green-400 text-sm font-semibold">This is your current active account.</div>
                            ) : u.recordCount > 0 ? (
                                <div className="pt-2 border-t border-gray-700 space-y-2">
                                    <button 
                                        onClick={() => handleMigrate(u.id, userId)}
                                        className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
                                    >
                                        Migrate these {u.recordCount} records to ME
                                    </button>
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm">No records to migrate</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
