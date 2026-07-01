const CACHE_NAME = 'piyak-cache-v9';
const urlsToCache = [
    '/manifest.json',
    '/images/icon-192x192.png',
    '/images/icon-512x512.png'
];

// Install event: Caches all required assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event: Intercepts network requests and serves cached assets first
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests, API routes, Clerk routes, and Next.js internals
    const url = new URL(event.request.url);
    if (
        url.origin !== location.origin ||
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/__clerk/') ||
        url.pathname.startsWith('/_next/')
    ) {
        return; // Let the browser handle these normally (no event.respondWith)
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                
                // No cache match - fetch from network
                return fetch(event.request).then(networkResponse => {
                    // Optional: You can dynamically cache new pages here if you want,
                    // but for now we just return the network response.
                    return networkResponse;
                }).catch(() => {
                    // If network fails and it's a navigation request, we could return a fallback
                    // But for now just let it fail gracefully
                });
            })
    );
});

// Activate event: Clears out old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Push event: Receives background push from server
self.addEventListener('push', function(event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.message,
                icon: '/images/icon-192x192.png',
                badge: '/images/icon-192x192.png',
                vibrate: [200, 100, 200],
                tag: 'piyak-notification'
            };
            event.waitUntil(
                self.registration.showNotification(data.title || 'PiYak Update', options)
            );
        } catch (e) {
            console.error('Error parsing push data', e);
        }
    }
});

// Notification click event: Opens app when tapped
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            // If the app is already open, focus it
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not open, open a new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});