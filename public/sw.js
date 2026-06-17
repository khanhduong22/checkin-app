const CACHE_NAME = 'limart-attendance-v2';
const ASSETS_TO_CACHE = [
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/capybara_bg.png',
  '/capybara_mascot.png',
  '/icons/capy_ai.png',
  '/icons/capy_announce.png',
  '/icons/capy_badge.png',
  '/icons/capy_calendar.png',
  '/icons/capy_dashboard.png',
  '/icons/capy_hr.png',
  '/icons/capy_manager.png',
  '/icons/capy_payroll.png',
  '/icons/capy_request.png',
  '/icons/capy_settings.png',
  '/icons/capy_wfh.png',
  '/icons/capy_wheel.png',
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
  const url = new URL(event.request.url);

  // 1. Only intercept GET requests with http/https schemes
  if (
    event.request.method !== 'GET' ||
    (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://'))
  ) {
    return;
  }

  // 2. NEVER intercept Next.js RSC, API, hot-reloading, or dynamic page navigation requests
  if (
    event.request.headers.get('RSC') ||
    event.request.headers.get('Next-Router-State-Tree') ||
    event.request.headers.get('Next-Router-Prefetch') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/_next/data/') ||
    url.pathname.includes('hot-update') ||
    // Skip dynamic HTML pages
    url.pathname === '/' ||
    url.pathname === '/login' ||
    url.pathname.startsWith('/payroll') ||
    url.pathname.startsWith('/history') ||
    url.pathname.startsWith('/tasks') ||
    url.pathname.startsWith('/schedule') ||
    url.pathname.startsWith('/requests') ||
    url.pathname.startsWith('/rewards') ||
    url.pathname.startsWith('/packing') ||
    url.pathname.startsWith('/carrying') ||
    url.pathname.startsWith('/lucky-wheel') ||
    url.pathname.startsWith('/staff-tasks') ||
    url.pathname.startsWith('/admin')
  ) {
    return;
  }

  // 3. For all static assets, use cache-first or stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version immediately, update cache in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200 || networkResponse.status === 0) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
            return networkResponse;
          }

          // Cache static images, fonts, scripts, stylesheets
          const isImageOrFont = event.request.destination === 'image' || event.request.destination === 'font';
          const isStaticAsset = 
            url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff2|css|js)$/) ||
            url.pathname.includes('/_next/static/');

          const shouldCache = 
            (isStaticAsset && networkResponse.type === 'basic') ||
            (isImageOrFont && (networkResponse.type === 'cors' || networkResponse.type === 'opaque' || networkResponse.type === 'basic' || networkResponse.status === 200 || networkResponse.status === 0));

          if (shouldCache) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }

          return networkResponse;
        })
        .catch(() => {
          // No network and no cache
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
