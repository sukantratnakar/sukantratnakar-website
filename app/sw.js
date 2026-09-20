/**
 * Sukant Ratnakar Website - Service Worker
 * - Offline support for all pages
 * - Auto-sync with instant updates
 */

const CACHE_NAME = 'sukant-netfirst01';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/dictionary.html',
  '/crm.html',
  '/crm-l.html',
  '/business-events.html',
  '/apple-touch-icon.png',
  '/manifest.json'
];

// Install
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch - Stale-while-revalidate for HTML, cache-first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if (event.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;
  
  // Network-first for API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Network-first for HTML.
  //
  // This was stale-while-revalidate (`return cached || fetchPromise`), which
  // served the PREVIOUS build to every returning visitor on first load and only
  // refreshed for the visit after. Found 8 Sep 2026: a stale page was still
  // showing an old light-themed design whose .about-grid lacked
  // `align-items:start`, so the grid stretched the portrait to the height of the
  // bio column beside it -- a 45% horizontal squeeze. The image was fine; the
  // whole cached page was old. Pricing and booking-link changes were invisible
  // to returning visitors for the same reason.
  //
  // Now: always fetch the live page, fall back to cache only when offline.
  // Do not revert to cache-first here.
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }))
  );
});

// Message handler
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
