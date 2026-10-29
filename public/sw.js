const SHELL_CACHE = 'rofik-godi-shell-v11';
const RUNTIME_CACHE = 'rofik-godi-runtime-v11';
const APP_SHELL = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-foreground.png',
  '/icon-maskable-512.png',
];

const isSupabaseRequest = (url) =>
  url.hostname.endsWith('.supabase.co') ||
  url.hostname.endsWith('.supabase.in') ||
  url.pathname.startsWith('/auth/') ||
  url.pathname.startsWith('/rest/') ||
  url.pathname.startsWith('/storage/') ||
  url.pathname.startsWith('/functions/') ||
  url.pathname.startsWith('/api/');

const isViteDevelopmentRequest = (url) =>
  url.pathname.startsWith('/src/') ||
  url.pathname.startsWith('/@vite/') ||
  url.pathname.startsWith('/@id/') ||
  url.pathname.startsWith('/@fs/') ||
  url.pathname.startsWith('/@react-refresh') ||
  url.pathname.startsWith('/node_modules/.vite/');

const isCacheableSameOrigin = (request) => {
  const url = new URL(request.url);
  return url.origin === self.location.origin &&
    request.method === 'GET' &&
    !isSupabaseRequest(url) &&
    !isViteDevelopmentRequest(url);
};

const isVersionedAsset = (url) =>
  /\/assets\/[^/]+-[\w-]{8,}\.(?:js|mjs|css|woff2?|png|svg|webp|jpe?g|avif)$/i.test(url.pathname);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isCacheableSameOrigin(request)) return;

  if (request.mode === 'navigate') {
    const update = fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone())).catch(() => {});
      }
      return response;
    });
    event.waitUntil(update.then(() => undefined).catch(() => {}));
    event.respondWith(update.catch(async () => {
      const cached = await caches.match(request) || await caches.match('/index.html') || await caches.match('/');
      return cached || new Response('Offline', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }));
    return;
  }

  const url = new URL(request.url);
  const versioned = isVersionedAsset(url);
  if (versioned) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone())).catch(() => {});
        }
        return response;
      } catch {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })());
    return;
  }

  const update = fetch(request).then((response) => {
    if (response.ok && response.type === 'basic') {
      void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone())).catch(() => {});
    }
    return response;
  });
  event.waitUntil(update.then(() => undefined).catch(() => {}));
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      return await update;
    } catch {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
