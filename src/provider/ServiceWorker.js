// Set a name for the current cache
const cacheName = PACKAGE_VERSION;

// Default files to always cache
const cacheFiles = [
    './provider.html',
    './main-bundle.js',
    './tabStrip-bundle.js',
    './tabbing/tabstrip/tabstrip.html',
    './tabbing/tabstrip/css/tabs.css',
    './tabbing/tabstrip/css/image/close.png',
    './tabbing/tabstrip/css/image/maximize.png',
    './tabbing/tabstrip/css/image/minimize.png',
    './tabbing/tabstrip/css/image/restore.png',
    './errors/error.html',
    './errors/error-icon.png',
];

self.addEventListener('install', (e) => {
    // e.waitUntil Delays the event until the Promise is resolved
    e.waitUntil(
        // Open the cache
        caches.open(cacheName).then((cache) => {
            // Add all the default files to the cache
            return cache.addAll(cacheFiles);
        }));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        // Get all the cache keys (cacheName)
        caches.keys().then((cacheNames) => {
            return Promise.all(cacheNames.map((thisCacheName) => {
                // If a cached item is saved under a previous cacheName
                if (thisCacheName !== cacheName) {
                    // Delete that cached file
                    return caches.delete(thisCacheName);
                }
            }));
        }));
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        }));
});