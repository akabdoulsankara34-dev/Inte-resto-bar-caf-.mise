// ══ Service Worker — Integral Restaurant Bar & Café ══
// Version: 1.0.0
const CACHE_NAME = 'integral-resto-v1';

// Fichiers statiques à pré-cacher
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/logo.png',
  '/photo1.jpg',
  '/photo2.jpg',
  '/photo3.jpg',
  '/photo_4.jpeg',
  '/manifest.json'
];

// ── Installation ─────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(err => {
        console.warn('[SW Integral] Précache partiel:', err.message);
        return self.skipWaiting(); // Continuer même si certains fichiers manquent
      })
  );
});

// ── Activation — supprimer anciens caches ────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW Integral] Suppression ancien cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch — Network first pour les images, cache sinon ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les requêtes Firebase, API externes, CDN
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('unsplash') ||
    url.hostname.includes('fonts') ||
    url.protocol === 'chrome-extension:'
  ) {
    return; // Laisser passer sans interception
  }

  // Images locales : cache-first (rapide)
  if (/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => cached); // Si réseau échoue, retourner le cache
      })
    );
    return;
  }

  // Autres ressources : network-first
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
