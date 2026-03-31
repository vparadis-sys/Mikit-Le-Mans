// Service Worker — Mikit Terrains PWA
const CACHE_NAME = 'mikit-terrains-v1';

// Ressources essentielles à mettre en cache
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
];

// Installation : mise en cache des ressources essentielles
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Stratégie : Network First pour les API, Cache First pour les assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls (géocodage, cadastre, risques...) → toujours réseau
  if (url.hostname.includes('api-adresse.data.gouv.fr') ||
      url.hostname.includes('apicarto.ign.fr') ||
      url.hostname.includes('api.georisques.gouv.fr') ||
      url.hostname.includes('georisques.gouv.fr') ||
      url.hostname.includes('data.geopf.fr') ||
      url.hostname.includes('api.open-elevation.com') ||
      url.hostname.includes('infoterre.brgm.fr') ||
      url.hostname.includes('api.dvf.etalab.gouv.fr')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Tiles de carte → cache avec réseau en fallback
  if (url.hostname.includes('tile.openstreetmap.org') ||
      url.hostname.includes('data.geopf.fr')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Tout le reste → Cache First, réseau en fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
