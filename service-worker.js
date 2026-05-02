const CACHE_NAME = 'super-lino-bros-v10';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './js/ranking.js',
  './firebase.js',
  './manifest.json',
  './img/fundo.jpg',
  './img/fundo_mobile.jpg',
  './img/icon-192.png',
  './img/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        const responseToCache = networkResponse.clone();

        if (event.request.url.startsWith(self.location.origin)) {
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseToCache));
        }

        return networkResponse;
      });
    })
  );
});
