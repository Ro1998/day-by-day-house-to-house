const CACHE_NAME = 'family-app-v3';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/apple-touch-icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-96.png'
];
const API_CACHE = 'family-api-v1';
const STATIC_CACHE = 'family-static-v1';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
      caches.open(API_CACHE),
      caches.open(STATIC_CACHE)
    ]).then(() => {
      console.log('[SW] App shell cached successfully');
      self.skipWaiting();
    }).catch((error) => {
      console.error('[SW] Failed to cache app shell:', error);
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const oldCaches = cacheNames.filter((name) => 
        name !== CACHE_NAME && name !== API_CACHE && name !== STATIC_CACHE
      );
      return Promise.all(
        oldCaches.map((name) => {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      self.clients.claim();
    })
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Handle different request types
  if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

// Determine if request is for API
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/');
}

// Determine if request is for static asset
function isStaticAsset(url) {
  return /\.(js|css|png|jpg|jpeg|svg|woff|woff2)$/i.test(url.pathname);
}

// Handle API requests with network-first strategy
function handleAPIRequest(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        // Cache successful API responses for 5 minutes
        const responseToCache = response.clone();
        caches.open(API_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return response;
    })
    .catch(() => {
      // Fallback to cached API response if network fails
      return caches.match(request);
    });
}

// Handle static assets with cache-first strategy
function handleStaticAsset(request) {
  return caches.match(request).then((cached) => {
    if (cached) {
      // Return cached asset immediately
      return cached;
    }
    
    // Fetch from network and cache
    return fetch(request).then((response) => {
      if (response.ok) {
        const responseToCache = response.clone();
        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return response;
    });
  });
}

// Handle navigation requests
function handleNavigationRequest(request) {
  // Try network first for navigation
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        return response;
      }
      throw new Error('Network response not ok');
    })
    .catch(() => {
      // Fallback to cached page or offline page
      return caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        // Return offline page if available
        return caches.match('/').then((indexPage) => {
          return indexPage || new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
          });
        });
      });
    });
}

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle cache management messages
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    caches.open(CACHE_NAME).then((cache) => {
      return cache.add(event.data.url);
    });
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle any queued offline actions
  console.log('[SW] Background sync triggered');
  return Promise.resolve();
}
