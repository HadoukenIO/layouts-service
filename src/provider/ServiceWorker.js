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
	'./tabbing/tabstrip/css/image/maximise.png',
	'./tabbing/tabstrip/css/image/minimize.png',
	'./tabbing/tabstrip/css/image/restore.png'
]

self.addEventListener('install', function(e) {
    // e.waitUntil Delays the event until the Promise is resolved
    e.waitUntil(
    	// Open the cache
	    caches.open(cacheName).then(function(cache) {

	    	// Add all the default files to the cache
				return cache.addAll(cacheFiles);
	    })
	);
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
    	// Get all the cache keys (cacheName)
		caches.keys().then(function(cacheNames) {
			return Promise.all(cacheNames.map(function(thisCacheName) {

				// If a cached item is saved under a previous cacheName
				if (thisCacheName !== cacheName) {
					// Delete that cached file
					return caches.delete(thisCacheName);
				}
			}));
		})
	);
});

self.addEventListener('fetch', function(event) {
	event.respondWith(
	  fetch(event.request).catch(function() {
			return caches.match(event.request);
	  })
	);
});