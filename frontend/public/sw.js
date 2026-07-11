// Service Worker mínimo do Valquíria Chat.
// Objectivo único: tornar a app instalável como PWA (critério exigido pelo
// Chrome/Android). NÃO interceptamos pedidos à API nem ao Socket.IO — o chat
// em tempo real precisa sempre de ir à rede, por isso deixamos esses pedidos
// passar diretamente sem cache.

const CACHE_NAME = 'valquiria-chat-shell-v1';
const STATIC_EXTENSIONS = ['.js', '.css', '.png', '.svg', '.woff2', '.woff'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca mexer em chamadas à API ou ao Socket.IO — têm de ir sempre à rede.
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/uploads')) {
    return;
  }

  // Só cacheia pedidos GET de assets estáticos (JS/CSS/imagens/fontes).
  const isStaticAsset = STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
  if (event.request.method !== 'GET' || !isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const networkResponse = await fetch(event.request);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch (err) {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        throw err;
      }
    })
  );
});
