'use strict';

const CACHE_PREFIX = 'tortu2-shell-';
const CACHE_NAME = CACHE_PREFIX + 'v4';
const SHELL_URLS = [
  '/',
  '/manifest.webmanifest',
  '/activity-policy.js',
  '/icons/tortu2-192.png',
  '/icons/tortu2-512.png',
  '/icons/tortu2-192.svg',
  '/icons/tortu2-512.svg'
];
const STATIC_URLS = new Set(SHELL_URLS.slice(1));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname.startsWith('/api/') || url.pathname === '/backend' ||
      url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put('/', response.clone());
        return response;
      } catch {
        return (await cache.match('/')) ||
          new Response('Negocio no está disponible sin conexión todavía.', {
            status: 503,
            headers: { 'content-type': 'text/plain; charset=utf-8' }
          });
      }
    })());
    return;
  }

  if (!STATIC_URLS.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url.pathname);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(url.pathname, response.clone());
    return response;
  })());
});
