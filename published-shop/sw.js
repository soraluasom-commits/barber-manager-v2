const cacheName='barber-manager-v2-shop-20261128-r1';
const cachePrefix='barber-manager-v2-shop-';
const base=new URL(self.registration.scope);
const core=['./index.html','./manifest.webmanifest','./legacy-auth.css','./legacy-host.js?v=20261126.1',
  './legacy-firebase.js','./firebase-config.js','./cloud-merge.js','./storefront-storage.js',
  './shop-core.js?v=20261126.1','./shop-enhancements.js?v=20261126.1','./navigation-groups.js?v=20261125.2','./storefront-runtime.js?v=20261128.1',
  './storefront-nav.js?v=20261125.2','./legacy-json.js?v=20261128.1',
  './work-details.js?v=20261126.1','./unified-backup.js?v=20261128.1','./staff-identity.js','./csp-events.js',
  './store/backup-validation.js','./shop-layout.css?v=20261125.2','./shop-panels.css','./review-logo-transparent.png'];
const assetTypes=/\.(?:js|css|png|webp|svg|ttf|woff2|webmanifest|html)$/i;
self.addEventListener('install',event=>event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(core))));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(cachePrefix)&&key!==cacheName).map(key=>caches.delete(key))))
));
self.addEventListener('fetch',event=>{
  const {request}=event,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
  const file=url.pathname.slice(base.pathname.length);
  if((!assetTypes.test(file)&&file!=='')||file.startsWith('qa/'))return;
  const cacheKey=!file||file==='index.html'?new URL('./index.html',base).href:url.href;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok){
      const snapshot=response.clone();
      event.waitUntil(caches.open(cacheName).then(cache=>cache.put(cacheKey,snapshot)));
    }
    return response;
  }).catch(async()=>{
    const cache=await caches.open(cacheName);
    return await cache.match(cacheKey)||Response.error();
  }));
});
