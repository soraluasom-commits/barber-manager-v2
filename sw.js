const CACHE='barber-manager-cloud-1';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./staff-days-off.js','./firebase-config.js','./cloud-merge.js','./cloud-sync.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', e => {
  const allowed = ASSETS.map(path => new URL(path, self.registration.scope).href);
  if (e.request.method !== 'GET' || !allowed.includes(e.request.url)) return;
  e.respondWith(fetch(e.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      e.waitUntil(caches.open(CACHE).then(cache => cache.put(e.request, copy)));
    }
    return response;
  }).catch(() => caches.match(e.request).then(hit => hit || Response.error())));
});
