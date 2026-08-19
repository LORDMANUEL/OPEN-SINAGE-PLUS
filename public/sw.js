const SHELL_CACHE = 'open-signage-plus-shell-v2';
const MEDIA_CACHE = 'open-signage-plus-media-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  const keep = new Set([SHELL_CACHE, MEDIA_CACHE]);
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => !keep.has(key)).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'PRECACHE_MEDIA' || !Array.isArray(event.data.urls)) return;
  event.waitUntil(caches.open(MEDIA_CACHE).then(async cache => {
    for (const value of event.data.urls.slice(0, 100)) {
      try {
        const url = new URL(value, self.location.origin);
        if (!['http:', 'https:'].includes(url.protocol)) continue;
        const request = new Request(url.toString(), { mode: url.origin === self.location.origin ? 'same-origin' : 'no-cors', credentials: 'omit' });
        const response = await fetch(request);
        if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
      } catch { /* one failed asset must not poison the scene cache */ }
    }
  }));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  const isNavigation = event.request.mode === 'navigate';
  const isMedia = event.request.destination === 'image' || event.request.destination === 'video' || event.request.destination === 'audio' || !url.pathname.match(/\.(js|css|html|json|webmanifest)$/i);

  if (isNavigation) {
    event.respondWith(fetch(event.request).then(response => {
      caches.open(SHELL_CACHE).then(cache => cache.put('/index.html', response.clone()));
      return response;
    }).catch(() => caches.match('/index.html')));
    return;
  }

  if (isMedia) {
    event.respondWith(caches.open(MEDIA_CACHE).then(async cache => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request).then(response => {
        if (response.ok || response.type === 'opaque') cache.put(event.request, response.clone());
        return response;
      }).catch(() => null);
      return cached || await network || new Response('', { status: 504 });
    }));
    return;
  }

  event.respondWith(fetch(event.request).then(response => {
    const clone = response.clone();
    caches.open(SHELL_CACHE).then(cache => cache.put(event.request, clone));
    return response;
  }).catch(() => caches.match(event.request)));
});
