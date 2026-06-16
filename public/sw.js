const CACHE_NAME = 'limart-attendance-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/login',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests with http/https schemes, and skip API, Auth, and Web Development hot-reloading routes
  if (
    event.request.method !== 'GET' ||
    (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('/_next/') ||
    event.request.url.includes('hot-update')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response immediately, but fetch fresh content in the background (stale-while-revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Ignore background refresh failures (e.g. offline)
          });
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Return offline fallback if network fails
          if (event.request.mode === 'navigate') {
            return caches.match('/login') || caches.match('/');
          }
        });
    })
  );
});
