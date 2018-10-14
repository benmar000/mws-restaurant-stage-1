import idb from 'idb';

var dbPromise = idb.open('test-db', 1, function(upgradeDb) {
  var keyValStore = upgradeDb.createObjectStore('keyval');
  keyValStore.put("world", "hello");
});

var siteCache = 'mws-cache-v1';
var urlsToCache = [
  '/',
  '/css/styles.css',
  '/js/',
  '/js/main.js',
  '/js/restaurant_info.js',
  '/js/dbhelper.js',
  '/js/sw/register.js',
  '/index.html',
  '/restaurant.html',
  '/data/restaurants.json'
]

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(siteCache)
      .then(function (cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      }).catch(function (error) {
        console.log('Failed to open cache with error: ', error)
      })
  );
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        // Found in cache 
        if (response) {
          return response;
        }
        // Not found in catch

        // Clone the request since it's a stream that can only be used once. 
        var fetchRequest = event.request.clone();

        return fetch (fetchRequest)
          .then(function (response) {
            // check if response is valid
            // response type 'basic' prevents third party resources from saving
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response since it's a stream that can only be used once
            var fetchResponse = response.clone();

            caches.open(siteCache)
              .then(function (cache) {
                console.log('saving to cache');
                cache.put(event.request, fetchResponse);
              });
            return response;
          }).catch(function (error) {
            console.log(error);
            return new Response('Application is not connected to the internet', {
              status: 404,
              statusText: 'Application is not connected to the internet',
            });
          })
      })
  )
});



