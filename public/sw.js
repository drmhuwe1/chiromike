const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  shell: `${CACHE_VERSION}-shell`,
  assets: `${CACHE_VERSION}-assets`,
  api: `${CACHE_VERSION}-api`
};

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json'
];

// Installation: cache critical shell assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAMES.shell).then((cache) => {
      console.log('[ServiceWorker] Caching shell assets');
      return cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Shell cache partial failure:', err.message);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activation: clean up old cache versions
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !Object.values(CACHE_NAMES).includes(name))
          .map((name) => {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for assets, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external origins and data URLs
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation requests: cache-first (fallback to network)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          // Cache successful navigation responses
          if (response && response.status === 200) {
            const cache = caches.open(CACHE_NAMES.shell);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        }).catch(() => {
          // Return cached version if offline
          return caches.match('/index.html');
        });
      })
    );
    return;
  }

  // Static assets (.js, .css, .woff2, images): cache-first
  if (/\.(js|css|woff2|png|jpg|jpeg|svg|ico|webp)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const cache = caches.open(CACHE_NAMES.assets);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // API calls: network-first
  if (url.pathname.includes('/api') || url.pathname.includes('/functions')) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.status === 200) {
          const cache = caches.open(CACHE_NAMES.api);
          cache.then((c) => c.put(request, response.clone()));
        }
        return response;
      }).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }
});
