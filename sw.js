const CACHE_NAME = 'aitalk-cache-v1';
const urlsToCache = [
  './index.html',
  'https://unpkg.com/vue@3/dist/vue.global.prod.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // 如果缓存里有，直接用缓存
      if (response) return response;
      // 如果缓存里没有，去网络请求。如果网络断了，返回一个友好的提示，防止白屏
      return fetch(event.request).catch(() => {
        return new Response('网络似乎断了，但我还在这里。', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});