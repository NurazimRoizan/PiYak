const CACHE_NAME = 'piyak-cache-v2';
const urlsToCache = [
    './', // Caches the root index.html
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './images/icon-192x192.png',
    './images/icon-512x512.png'
    // Add any other font or image assets here
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
    // Only intercept requests for files we can cache
    if (urlsToCache.includes(event.request.url.replace(location.origin, '.'))) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Cache hit - return response
                    if (response) {
                        return response;
                    }
                    // No cache match - fetch from network
                    return fetch(event.request);
                })
        );
    } else {
        // For external resources (like Google Fonts or Apps Script), fetch them normally
        return fetch(event.request);
    }
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