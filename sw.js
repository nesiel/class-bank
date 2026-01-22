
const CACHE_NAME = 'classroom-bank-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Install: Cache core assets immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network First for HTML, Cache First for Assets, Fallback to index.html
self.addEventListener('fetch', (event) => {
  // Ignore non-http requests
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // 1. Navigation (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If valid response, clone and cache it
          if (response && response.status === 200) {
             const clone = response.clone();
             caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
             return response;
          }
          return response;
        })
        .catch(() => {
          // Network failed, try to get the page from cache
          return caches.match(event.request).then((cachedResponse) => {
             if (cachedResponse) return cachedResponse;
             // Fallback: If exact page not found, return index.html (SPA Pattern)
             return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // 2. Assets (JS, CSS, Images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
           const clone = networkResponse.clone();
           caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});
