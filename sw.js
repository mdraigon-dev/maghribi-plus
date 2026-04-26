const CACHE_NAME = 'sham-yasmin-v1';
const STATIC_ASSETS = [
  '/maghribi-plus/',
  '/maghribi-plus/index.html',
  '/maghribi-plus/manifest.json',
  '/maghribi-plus/icon-192.png',
  '/maghribi-plus/icon-512.png'
];

// Install: cache core shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for M3U/streams, cache-first for shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network for M3U playlists and stream URLs
  if (
    url.hostname !== location.hostname ||
    url.pathname.endsWith('.m3u') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.includes('get.php')
  ) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Cache-first for app shell
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return response;
      }).catch(() => caches.match('/maghribi-plus/index.html'));
    })
  );
});
