const CACHE='barber-manager-v2-0-2';
const ASSETS=["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./css/01.css", "./css/02.css", "./css/03.css", "./css/04.css", "./css/05.css", "./js/01.js", "./js/02.js", "./js/03.js", "./js/04.js", "./js/05.js", "./js/06.js", "./js/07.js"];

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))));});
