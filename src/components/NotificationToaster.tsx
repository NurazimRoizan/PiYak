'use client';

import { useState, useEffect } from 'react';

interface Notification {
    id: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationToaster() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    
    useEffect(() => {
        // Request Notification permission if supported and not already requested
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }

        const fetchNotifications = async () => {
            try {
                const res = await fetch('/api/notifications');
                if (res.ok) {
                    const data = await res.json();
                    
                    if (data.notifications && data.notifications.length > 0) {
                        setNotifications(prev => {
                            const newNotifications = data.notifications.filter(
                                (n: Notification) => !prev.some(p => p.id === n.id)
                            );
                            
                            return data.notifications;
                        });
                    } else {
                        setNotifications([]);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            }
        };

        // Initial fetch
        fetchNotifications();

        // Poll every 10 seconds
        const intervalId = setInterval(fetchNotifications, 10000);
        return () => clearInterval(intervalId);
    }, []);

    const dismissNotification = async (id: string) => {
        // Optimistic UI update
        setNotifications(prev => prev.filter(n => n.id !== id));

        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId: id })
            });
        } catch (error) {
            console.error("Failed to dismiss notification:", error);
        }
    };

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
            {notifications.map(notification => (
                <div 
                    key={notification.id}
                    className="bg-black text-white border-4 border-[#00FFFF] shadow-[6px_6px_0_0_#FF00FF] p-4 max-w-[300px] animate-bounce-short relative transform rotate-[2deg] hover:rotate-0 transition-transform"
                >
                    <button 
                        onClick={() => dismissNotification(notification.id)}
                        className="absolute -top-3 -right-3 bg-[#FF00FF] text-white border-2 border-white w-8 h-8 flex items-center justify-center font-bold shadow-[2px_2px_0_0_#000] hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0 active:shadow-none transition-all"
                    >
                        X
                    </button>
                    <div className="font-extrabold uppercase text-lg mb-1 text-[#FFFF00]">Heads up!</div>
                    <div className="font-bold">{notification.message}</div>
                </div>
            ))}
        </div>
    );
}
