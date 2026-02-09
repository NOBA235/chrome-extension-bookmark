// PinPoint Bookmark Manager Service Worker
// Version: 1.0.0
const CACHE_NAME = 'pinpoint-v1.1';
const APP_SHELL_CACHE = 'pinpoint-app-shell-v1.1';
const DATA_CACHE = 'pinpoint-data-v1.1';

// Files to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Font Awesome fallback icons (inline SVG for critical icons)
const FALLBACK_ICONS = {
  '/icons/bookmark.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
  '/icons/star.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>'
};

// Install event - cache critical assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Install completed');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches that aren't the current ones
          if (cacheName !== CACHE_NAME && 
              cacheName !== APP_SHELL_CACHE && 
              cacheName !== DATA_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] Activation completed');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || 
      requestUrl.protocol === 'chrome-extension:' ||
      requestUrl.hostname === 'chrome.google.com') {
    return;
  }

  // Handle favicon requests (use fallback)
  if (requestUrl.hostname === 'www.google.com' && 
      requestUrl.pathname.includes('/s2/favicons')) {
    event.respondWith(handleFaviconRequest(event.request));
    return;
  }

  // Handle API requests (none for now, but future-proof)
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event));
    return;
  }

  // For navigation requests, try cache first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then(response => response || fetch(event.request))
    );
    return;
  }

  // For static assets, use cache-first strategy
  if (PRECACHE_URLS.some(url => 
      event.request.url.includes(url) || 
      event.request.url.endsWith('.css') ||
      event.request.url.endsWith('.js') ||
      event.request.url.endsWith('.json'))) {
    
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Update cache in background
            fetchAndCache(event.request);
            return cachedResponse;
          }
          return fetchAndCache(event.request);
        })
        .catch(() => {
          // If both cache and network fail, return fallback
          return fallbackResponse(event.request);
        })
    );
    return;
  }

  // For other requests, try network first
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If successful, cache a copy
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(DATA_CACHE)
            .then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then(cachedResponse => cachedResponse || fallbackResponse(event.request));
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[Service Worker] Sync event:', event.tag);
  
  if (event.tag === 'sync-bookmarks') {
    event.waitUntil(syncBookmarks());
  }
});

// Periodic sync for updates
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-favicons') {
    event.waitUntil(updateFavicons());
  }
});

// Push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received');
  
  const options = {
    body: event.data?.text() || 'New notification from PinPoint',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('PinPoint', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click');
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If a PinPoint window is open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Helper functions
async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const cache = await caches.open(APP_SHELL_CACHE);
    await cache.put(request, response.clone());
    
    return response;
  } catch (error) {
    console.error('[Service Worker] Fetch and cache failed:', error);
    throw error;
  }
}

function handleFaviconRequest(request) {
  return caches.match(request)
    .then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Try to fetch favicon
      return fetch(request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE)
              .then(cache => cache.put(request, responseClone));
            return response;
          }
          throw new Error('Favicon fetch failed');
        })
        .catch(() => {
          // Return a generic favicon as fallback
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10b981"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
            {
              headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=86400'
              }
            }
          );
        });
    });
}

async function handleApiRequest(event) {
  const cache = await caches.open(DATA_CACHE);
  
  try {
    // Try network first for API calls
    const response = await fetch(event.request);
    
    if (response.ok) {
      // Cache successful API responses
      await cache.put(event.request, response.clone());
      return response;
    }
    
    throw new Error('API request failed');
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(event.request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ error: 'Network unavailable and no cached data' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

function fallbackResponse(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Check if we have a fallback icon
  if (FALLBACK_ICONS[path]) {
    return new Response(FALLBACK_ICONS[path], {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  }
  
  // Generic fallback for HTML pages
  if (request.headers.get('Accept')?.includes('text/html')) {
    return caches.match('/index.html');
  }
  
  // Generic fallback for CSS
  if (request.headers.get('Accept')?.includes('text/css')) {
    return new Response('/* Fallback CSS */', {
      headers: { 'Content-Type': 'text/css' }
    });
  }
  
  // Return a generic error
  return new Response('Resource not available offline', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
}

async function syncBookmarks() {
  console.log('[Service Worker] Syncing bookmarks...');
  
  // In a real app, this would sync with a backend
  // For now, just update the cache
  try {
    const cache = await caches.open(DATA_CACHE);
    const bookmarksData = await getBookmarksFromStorage();
    
    // Store in cache for offline access
    const response = new Response(JSON.stringify(bookmarksData), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put('/api/bookmarks', response);
    console.log('[Service Worker] Bookmarks synced');
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

async function updateFavicons() {
  console.log('[Service Worker] Updating favicons...');
  // This would update cached favicons in a real app
}

async function getBookmarksFromStorage() {
  // This is a placeholder for getting bookmarks from IndexedDB
  // For now, return empty array
  return [];
}

// Listen for messages from the main thread
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_BOOKMARKS') {
    cacheBookmarksData(event.data.payload);
  }
});

async function cacheBookmarksData(bookmarks) {
  try {
    const cache = await caches.open(DATA_CACHE);
    const response = new Response(JSON.stringify(bookmarks), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put('/data/bookmarks.json', response);
    console.log('[Service Worker] Bookmarks data cached');
  } catch (error) {
    console.error('[Service Worker] Failed to cache bookmarks:', error);
  }
}

// Cache cleanup on version update
self.addEventListener('message', event => {
  if (event.data.action === 'cleanupCache') {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('pinpoint-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    });
  }
});