'use client';

import { useState, useEffect, Component, type ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';

interface NotificationItem {
    id: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

// Error boundary wrapper to guarantee NotificationToaster never crashes RootLayout
class ToasterErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: unknown) {
        console.warn('[NotificationToaster] Suppressed unexpected error to prevent app crash:', error);
    }

    render() {
        if (this.state.hasError) return null;
        return this.props.children;
    }
}

function NotificationToasterInner() {
    const { userId } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    
    useEffect(() => {
        if (!userId) return;

        // Safely check notification permission
        if (typeof window !== 'undefined' && 'Notification' in window) {
            try {
                if (Notification.permission === 'default') {
                    Notification.requestPermission().catch(() => {});
                }
            } catch {
                // Ignore permission request error
            }
        }

        const showNativeNotification = async (message: string) => {
            if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
                return;
            }

            try {
                // In Chrome on Android (and PWAs), `new Notification()` throws an Illegal Constructor TypeError.
                // Mobile Chromium requires ServiceWorkerRegistration.showNotification().
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready;
                    if (registration && typeof registration.showNotification === 'function') {
                        await registration.showNotification('PiYak Update', {
                            body: message,
                            icon: '/images/icon-192x192.png',
                            badge: '/images/icon-192x192.png',
                            tag: 'piyak-notification'
                        });
                        return;
                    }
                }

                // Desktop browser fallback
                new Notification('PiYak Update', {
                    body: message,
                    icon: '/images/icon-192x192.png',
                });
            } catch (err) {
                // Never let native notification failure bubble or crash the UI
                console.warn('[NotificationToaster] Could not display native notification:', err);
            }
        };

        const fetchNotifications = async () => {
            if (!userId) return;
            try {
                const res = await fetch('/api/notifications');
                if (res.ok) {
                    const data = await res.json();
                    const fetchedList: NotificationItem[] = data.notifications || [];
                    
                    if (fetchedList.length > 0) {
                        setNotifications(prev => {
                            const newNotifications = fetchedList.filter(
                                (n: NotificationItem) => !prev.some(p => p.id === n.id)
                            );
                            
                            // Trigger native OS notifications OUTSIDE the React state updater
                            if (newNotifications.length > 0) {
                                setTimeout(() => {
                                    for (const n of newNotifications) {
                                        showNativeNotification(n.message);
                                    }
                                }, 0);
                            }
                            
                            return fetchedList;
                        });
                    } else {
                        setNotifications([]);
                    }
                }
            } catch (error) {
                console.warn('[NotificationToaster] Failed to fetch notifications:', error);
            }
        };

        // Initial fetch
        fetchNotifications();

        // Poll every 10 seconds
        const intervalId = setInterval(fetchNotifications, 10000);
        return () => clearInterval(intervalId);
    }, [userId]);

    const dismissNotification = async (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));

        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId: id })
            });
        } catch (error) {
            console.warn('[NotificationToaster] Failed to dismiss notification:', error);
        }
    };

    if (!userId || notifications.length === 0) return null;

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

export default function NotificationToaster() {
    return (
        <ToasterErrorBoundary>
            <NotificationToasterInner />
        </ToasterErrorBoundary>
    );
}
