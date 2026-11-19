'use strict';

const prefix = `pau-de-carga:${self.registration.scope}:`;
const cacheName = `${prefix}v2`;
const files = ['./index.html', './style.css', './app.js', './manifest.json', './icon-192.png', './icon-512.png'];
const urls = new Set(files.map(path => new URL(path, self.registration.scope).href));
const home = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files.map(path => new Request(path, { cache: 'reload' })))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names
    .filter(name => name.startsWith(prefix) && name !== cacheName)
    .map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.href.startsWith(self.registration.scope)) return;
  if (event.request.mode === 'navigate' && (url.pathname === new URL(self.registration.scope).pathname || url.pathname === new URL(home).pathname)) {
    event.respondWith(caches.open(cacheName).then(cache => cache.match(home)).then(response => response || fetch(event.request)));
  } else if (urls.has(url.href)) {
    event.respondWith(caches.open(cacheName).then(cache => cache.match(event.request)).then(response => response || fetch(event.request)));
  }
});
