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

export default function PushNotificationButton() {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            
            // Check if already subscribed
            navigator.serviceWorker.ready.then((registration) => {
                registration.pushManager.getSubscription().then((subscription) => {
                    setIsSubscribed(subscription !== null);
                    setLoading(false);
                });
            });
        } else {
            setLoading(false);
        }
    }, []);

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
            } else {
                console.error("Failed to save subscription on server");
            }
        } catch (error) {
            console.error("Failed to subscribe", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isSupported || loading) {
        return null; // Don't show anything if unsupported or loading
    }

    if (isSubscribed) {
        return (
            <div className="bg-black text-[#00FFFF] border-2 border-[#00FFFF] px-3 py-1 text-xs uppercase font-extrabold flex items-center justify-center gap-1 shadow-[2px_2px_0_0_#00FFFF] mt-1">
                <span className="text-sm">🔔</span> Notifications On
            </div>
        );
    }

    return (
        <button 
            onClick={subscribeToPush}
            className="bg-[#00FFFF] text-black border-2 border-black hover:-translate-y-1 shadow-[2px_2px_0_0_#000] hover:shadow-[4px_4px_0_0_#000] px-3 py-1 text-xs uppercase font-extrabold transition-transform mt-1 animate-pulse"
        >
            🔔 Enable Notifications
        </button>
    );
}
