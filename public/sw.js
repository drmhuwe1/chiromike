// ChiroMike Service Worker — SPA offline shell cache
const CACHE_NAME = 'chiromike-v1';

// On install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/index.html'])
    )
  );
  self.skipWaiting();
});

// On activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Same-origin navigation requests → serve cached index.html (SPA fallback)
// - Same-origin static assets → cache-first
// - Cross-origin (API, fonts, CDN) → network-only
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests entirely
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // SPA navigation: always return the cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => cached || fetch(request))
    );
    return;
  }

  // Static assets: cache-first, fall back to network and cache the result
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
