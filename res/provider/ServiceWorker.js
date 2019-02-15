 // Set a name for the current cache
const cacheName = '1.0'; 

// Default files to always cache
const cacheFiles = [
	'./tabbing/tabstrip/tabstrip.html',
	'./tabStrip-bundle.js',
	'./provider.html',
	'./main-bundle.js',
	'./tabbing/tabstrip/css/tabs.css'
]

self.addEventListener('install', function(e) {
    // e.waitUntil Delays the event until the Promise is resolved
    e.waitUntil(
    	// Open the cache
	    caches.open(cacheName).then(function(cache) {

	    	// Add all the default files to the cache
				return cache.addAll(cacheFiles);
	    })
	); // end e.waitUntil
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
	); // end e.waitUntil
});

self.addEventListener('fetch', function(event) {
	event.respondWith(
	  fetch(event.request).catch(function() {
			return caches.match(event.request);
	  })
	);
});