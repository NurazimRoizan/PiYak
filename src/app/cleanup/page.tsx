'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function CleanupPage() {
    const { userId, isLoaded } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isLoaded && userId) {
            fetch('/api/cleanup')
                .then(res => res.json())
                .then(data => {
                    setRecords(data.records || []);
                    setLoading(false);
                })
                .catch(err => {
                    setStatus('Failed to load records');
                    setLoading(false);
                });
        }
    }, [isLoaded, userId]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Are you sure you want to permanently delete ${selectedIds.size} records?`)) return;
        
        setStatus('Deleting...');
        try {
            const res = await fetch('/api/cleanup', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recordIds: Array.from(selectedIds) })
            });
            const data = await res.json();
            
            if (data.success) {
                setStatus(`✅ Successfully deleted ${selectedIds.size} records!`);
                setRecords(records.filter(r => !selectedIds.has(r.id)));
                setSelectedIds(newSet => { newSet.clear(); return newSet; });
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
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-red-500">Data Cleanup Tool</h1>
                    <button 
                        onClick={handleDelete}
                        disabled={selectedIds.size === 0}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold"
                    >
                        Delete Selected ({selectedIds.size})
                    </button>
                </div>
                
                <p className="text-gray-400 text-sm">
                    Select the fake records you want to purge. Your actual, unharmed records are perfectly safe. Just check the boxes next to the fake dates injected by the attacker and click Delete.
                </p>

                {status && (
                    <div className="p-4 bg-gray-800 rounded-lg text-center font-medium border border-gray-700">
                        {status}
                    </div>
                )}

                <div className="space-y-2">
                    {records.map(r => (
                        <div 
                            key={r.id} 
                            onClick={() => toggleSelection(r.id)}
                            className={`p-4 rounded-xl border flex justify-between items-center cursor-pointer transition-colors ${selectedIds.has(r.id) ? 'bg-red-900/50 border-red-500' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded border flex items-center justify-center ${selectedIds.has(r.id) ? 'bg-red-500 border-red-500' : 'border-gray-500'}`}>
                                    {selectedIds.has(r.id) && <span>✓</span>}
                                </div>
                                <div>
                                    <p className="font-bold text-lg">{r.dateKey}</p>
                                    <p className="text-sm text-gray-400">
                                        Count: {r.counterValue} | Status: {r.status || 'None'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {records.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No records found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
