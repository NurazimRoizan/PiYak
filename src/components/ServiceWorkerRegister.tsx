'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then((registration) => {
                // Force check for updates every time the app loads
                registration.update();
            }).catch(err => {
                console.error("Service Worker registration failed:", err);
            });
        }
    }, []);

    return null;
}
