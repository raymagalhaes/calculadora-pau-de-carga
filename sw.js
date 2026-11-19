'use strict';

const prefix = `pau-de-carga:${self.registration.scope}:`;
const cacheName = `${prefix}v6`;
const files = ['./index.html', './style.css', './app.js', './manifest.json', './icon-192.png', './icon-512.png'];
const urls = new Set(files.map(path => new URL(path, self.registration.scope).href));
const home = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName)
    .then(cache => cache.addAll(files.map(path => new Request(path, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names
    .filter(name => name.startsWith(prefix) && name !== cacheName)
    .map(name => caches.delete(name)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;

  const navigation = event.request.mode === 'navigate';
  const isHome = navigation && (url.pathname === new URL(self.registration.scope).pathname
    || url.pathname === new URL(home).pathname);
  if (isHome) {
    event.respondWith(fetch(new Request(home, { cache: 'no-store' }))
      .then(async response => {
        if (response.ok) (await caches.open(cacheName)).put(home, response.clone());
        return response;
      })
      .catch(async () => (await caches.open(cacheName)).match(home)));
  } else if (urls.has(url.href)) {
    event.respondWith(fetch(new Request(event.request, { cache: 'no-store' }))
      .then(async response => {
        if (response.ok) (await caches.open(cacheName)).put(event.request, response.clone());
        return response;
      })
      .catch(async () => (await caches.open(cacheName)).match(event.request)));
  }
});
