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