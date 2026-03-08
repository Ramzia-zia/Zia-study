// eslint-disable-next-line no-restricted-globals
self.addEventListener('install', (event) => {
  // eslint-disable-next-line no-restricted-globals
  self.skipWaiting();
});

// eslint-disable-next-line no-restricted-globals
self.addEventListener('activate', (event) => {
  // eslint-disable-next-line no-undef
  event.waitUntil(clients.claim());
});

// eslint-disable-next-line no-restricted-globals
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Zia Study';
  const options = {
    body: data.body || 'Vous avez un rappel',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    // eslint-disable-next-line no-restricted-globals
    self.registration.showNotification(title, options)
  );
});

// eslint-disable-next-line no-restricted-globals
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    // eslint-disable-next-line no-undef
    clients.openWindow('/')
  );
});