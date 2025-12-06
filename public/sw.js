const CACHE_NAME = 'zenith-v1.0.1';
const urlsToCache = [
  '/',
  '/site.webmanifest',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];


self.addEventListener('install', (event) => {
  // Activate updated SW immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Cache install failed:', error);
      })
  );
});


self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle GET over http/https
  try {
    const url = new URL(req.url);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || req.method !== 'GET') {
      return; // let the browser handle it
    }
  } catch {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Avoid caching wrong MIME for module scripts or styles
        const ct = response.headers.get('content-type') || '';
        const dest = req.destination || '';
        const isJS = dest === 'script' || /javascript|module/.test(ct);
        const isCSS = dest === 'style' || /text\/css/.test(ct);
        const isImage = /image\//.test(ct);
        const isFont = /font\//.test(ct) || /application\/font/.test(ct);

        const shouldCache = isJS || isCSS || isImage || isFont;

        try {
          const url = new URL(req.url);
          const sameOrigin = url.origin === self.location.origin;
          if (sameOrigin && shouldCache) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, copy).catch(() => {});
            }).catch(() => {});
          }
        } catch {}

        return response;
      }).catch(() => cached || fetch(req));
    })
  );
});


self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});


self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {

  return Promise.resolve();
}


self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do Zenith',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalhes',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Zenith', options)
  );
});


self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/marketplace')
    );
  }
});
