const CACHE_NAME = 'aitalk-cache-v5';
const urlsToCache = [
  './index.html'
];

// 安装阶段：立刻接管，不让它等
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    }).catch(err => {
      console.error('缓存失败，但不影响核心功能:', err);
    })
  );
});

// 激活阶段：清理旧缓存
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

// 拦截请求阶段：更稳健的断网降级
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(() => {
      return new Response('网络似乎断了，但我还在这里。', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    })
  );
});
