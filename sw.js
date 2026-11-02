const CACHE_NAME = 'aitalk-cache-v6'; // 🚨 一定要升级版本号
const urlsToCache = [
  './index.html',
  'https://unpkg.com/vue@3/dist/vue.global.prod.js',
  'https://cdn.jsdelivr.net/npm/idb-keyval@6.2.1/dist/umd.js',
  'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 用 allSettled 防止某个 CDN 抽风导致整个 PWA 挂掉
      return Promise.allSettled(urlsToCache.map(url => cache.add(url)));
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).catch(() => {
        // 如果你在断网时刷新了页面，兜底返回缓存的 index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('网络似乎断了，但我还在这里。', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});
