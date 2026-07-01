// ============================================================
// SOKONI SERVICE WORKER — Offline & PWA support
// ============================================================

const CACHE_NAME = 'sokoni-v1';
const STATIC_ASSETS = [
  '/msosi--app/',
  '/msosi--app/index.html',
  '/msosi--app/manifest.json',
];

// ── INSTALL: cache static assets ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Sokoni SW: Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('Cache failed (ok):', err);
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH: network first, fallback to cache ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip Supabase and Google API requests — always use network
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('cartocdn.com') ||
    url.hostname.includes('leafletjs') ||
    url.hostname.includes('jsdelivr')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/msosi--app/index.html');
          }
        });
      })
  );
});

// ── PUSH NOTIFICATIONS (future use) ──
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Sokoni', {
      body: data.body || 'You have a new update',
      icon: '/msosi--app/icon-192.png',
      badge: '/msosi--app/icon-192.png',
      data: { url: data.url || '/msosi--app/' },
      vibrate: [200, 100, 200],
      actions: [
        { action: 'view', title: 'View Order' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'view') {
    clients.openWindow(event.notification.data.url);
  }
});
