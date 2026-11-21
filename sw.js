const CACHE_NAME = 'aitalk-v2-1';
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
const CDN_ASSETS = [
  'https://unpkg.com/vue@3.5.13/dist/vue.global.prod.js',
  'https://cdn.jsdelivr.net/npm/idb-keyval@6.2.1/dist/umd.js',
  'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(LOCAL_ASSETS);
    // CDN 失败不应阻止应用安装；联网时再补缓存。
    await Promise.allSettled(CDN_ASSETS.map(url => cache.add(url)));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(name => {
      if (name.startsWith('aitalk-') && name !== CACHE_NAME) return caches.delete(name);
    }));
    await self.clients.claim();
  })());
});

async function cachePut(request, response) {
  if (!response || !response.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone()).catch(() => {});
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return cachePut(request, response);
  } catch (e) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const shell = await caches.match('./index.html');
    if (shell) return shell;
    return new Response('离线中，应用壳还没有缓存。', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request).then(response => cachePut(request, response)).catch(() => null);
  return cached || network;
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  return cachePut(request, response);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // 模型文件和 API 不经过 Service Worker，避免假响应和缓存污染。
  if (url.hostname === 'api.deepseek.com' || url.hostname.endsWith('hf-mirror.com')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (CDN_ASSETS.includes(request.url)) {
    event.respondWith(cacheFirst(request));
  }
});
