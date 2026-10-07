// バージョンを上げると確実に新しいキャッシュが使われます
const CACHE_NAME = 'instrument-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // 古いキャッシュを削除
      const keys = await caches.keys();
      await Promise.all(keys.map(k => {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  // ネットワーク優先で最新を取りに行き、失敗したらキャッシュを返す
  event.respondWith(
    fetch(event.request).then(resp => {
      // レスポンスをキャッシュに保存（GETのみ）
      if (event.request.method === 'GET') {
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
      }
      return resp;
    }).catch(() => caches.match(event.request).then(r => r || caches.match('./')))
  );
});

// メッセージで SKIP_WAITING を受け取ったら即座に activate
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
