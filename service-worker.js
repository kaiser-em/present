// Present — Service Worker : hors-ligne + mises à jour propres
const VERSION = 'present-v2.5.0';
const ASSETS = ['./', './index.html', './manifest.json', './css/tokens.css?v=7', './css/app.css?v=7',
  ...['util', 'i18n', 'icons', 'store', 'ui', 'forms', 'today', 'timeline', 'calendar', 'habit', 'statsview', 'coach', 'coach-plus', 'report', 'profile', 'notifier', 'timer', 'sync', 'app'].map((n) => `./js/${n}.js?v=7`),
  './assets/images/app-icon-192.png', './assets/images/app-icon-512.png', './assets/images/app-icon-maskable-512.png',
  './assets/images/apple-touch-icon.png', './assets/images/favicon-32.png', './assets/images/icon.svg'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.url.includes('progress-data.json') || r.url.includes('/api/')) return; // toujours frais, jamais en cache
  // stale-while-revalidate ; repli sur index.html hors-ligne
  e.respondWith(caches.match(r, { ignoreSearch: false }).then((hit) => {
    const net = fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(r, cp)); } return res; })
      .catch(() => hit || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    return hit || net;
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    const c = cs[0]; if (c) { c.focus(); return c.navigate && c.navigate((e.notification.data && e.notification.data.url) || './'); }
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});

// Notifications Web Push envoyées par le coach (même app fermée)
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Coach', {
    body: d.body || '', tag: d.tag || 'coach', icon: 'assets/images/app-icon-192.png', badge: 'assets/images/badge-96.png', data: { url: d.url || './#/coach' }
  }));
});
