const SHELL_CACHE = 'rofik-godi-shell-v4';
const RUNTIME_CACHE = 'rofik-godi-runtime-v4';
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
  url.pathname.startsWith('/functions/');

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

  // Never intercept cross-origin services, Supabase Auth/API/storage, or non-GET requests.
  if (!isCacheableSameOrigin(request)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('/index.html') || new Response('Offline', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }),
    );
    return;
  }

  // Cache same-origin hashed JS/CSS/images after a successful network response.
  event.respondWith(
    caches.match(request).then((cached) => {
      const cacheResponse = (response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      };
      if (cached) {
        void fetch(request).then(cacheResponse).catch(() => {});
        return cached;
      }
      return fetch(request).then(cacheResponse).catch(() => new Response('', { status: 504, statusText: 'Offline' }));
    }).catch(() => new Response('', { status: 504, statusText: 'Offline' })),
  );
});
