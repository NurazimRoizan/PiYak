'use client';

import { useState, useEffect } from 'react';

// This utility converts the base64 public key into a Uint8Array needed by the push manager
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function PushNotificationModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            
            // Check if already subscribed by explicitly registering first
            navigator.serviceWorker.register('/sw.js').then(() => {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.pushManager.getSubscription().then((subscription) => {
                        setIsSubscribed(subscription !== null);
                        setLoading(false);
                    });
                });
            }).catch(err => {
                console.error("Service Worker registration failed:", err);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [isOpen]);

    const subscribeToPush = async () => {
        try {
            setLoading(true);
            const registration = await navigator.serviceWorker.ready;
            
            // Request permission explicitly if not already granted
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    throw new Error('Permission not granted for Notification');
                }
            }

            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!publicKey) {
                console.error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
                alert("Cannot subscribe to push notifications: Missing VAPID Public Key.");
                setLoading(false);
                return;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            // Send subscription to server
            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(subscription.toJSON())
            });

            if (res.ok) {
                setIsSubscribed(true);
                setTimeout(() => onClose(), 1500); // Close after showing success
            } else {
                console.error("Failed to save subscription on server");
            }
        } catch (error) {
            console.error("Failed to subscribe", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white border-4 border-black p-6 w-full max-w-sm shadow-[8px_8px_0_0_#FF00FF]">
                <h2 className="text-2xl font-extrabold text-black uppercase mb-4 tracking-widest text-center border-b-4 border-black pb-2">
                    Push Notifications
                </h2>
                
                {!isSupported && !loading ? (
                    <p className="text-black font-bold text-center mb-6">
                        Your device/browser does not support Web Push Notifications. (If on iOS, make sure you add this app to your Home Screen first!)
                    </p>
                ) : loading ? (
                    <div className="text-black font-bold text-center mb-6 animate-pulse">Checking status...</div>
                ) : isSubscribed ? (
                    <div className="text-black font-bold text-center mb-6">
                        <div className="text-4xl mb-2">🔔</div>
                        <p>You are successfully subscribed to Push Notifications!</p>
                    </div>
                ) : (
                    <div className="text-black font-bold text-center mb-6">
                        <p className="mb-4">Get an instant notification whenever your partner logs a poop!</p>
                        <button 
                            onClick={subscribeToPush}
                            className="w-full bg-[#00FFFF] text-black border-4 border-black hover:-translate-y-1 shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none py-3 font-extrabold uppercase transition-all mb-2"
                        >
                            Enable Now
                        </button>
                    </div>
                )}

                <button 
                    onClick={onClose}
                    className="w-full bg-black text-white border-4 border-black hover:-translate-y-1 shadow-[4px_4px_0_0_#00FFFF] hover:shadow-[6px_6px_0_0_#00FFFF] active:translate-x-1 active:translate-y-1 active:shadow-none py-2 font-extrabold uppercase transition-all mt-2"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
