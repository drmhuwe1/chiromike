// Cache version — bump this string whenever you need to force a full cache purge
const CACHE_NAME = 'chiromike-v5';

// Only cache the app shell itself, not API calls or external resources
const SHELL_ASSETS = ['/'];

self.addEventListener('install', (event) => {
  // Take over immediately without waiting for old SW to finish
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately so the new SW serves pages right away
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Delete ALL old caches
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Never cache API / backend function calls
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/functions/')) return;

  // Network-first strategy: always try network, fall back to cache only for navigation
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache valid responses
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // On network failure, serve cached version for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/') || caches.match(request);
        }
        return caches.match(request);
      })
  );
});
