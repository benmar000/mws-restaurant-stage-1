var CACHE_NAME = 'mws-cache-v1';
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
    '/data/restaurants.json',
];

self.addEventListener('install', function (event) {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            }).catch(function (error) {
                console.log('Failed to open cache with error: ', error)
            })
    );
});

self.addEventListener('fetch', function (event) {
    //Perform fetch steps 
    event.respondWith(
        caches.match(event.request)
            .then(function (response) {
                //Cache hit - return response
                if (response) {
                    return response;
                }
                //Cache not hit 

                //Clone the request since it's a stream that can only be used once. 
                var fetchRequest = event.request.clone();

                return fetch(fetchRequest)
                    .then(function (response) {
                        // check if response is valid
                        // response type 'basic' prevents third party resources from saving
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        //Clone the response since it's a stream that can only be used once. 
                        var fetchResponse = response.clone();

                        caches.open(CACHE_NAME)
                            .then(function (cache) {
                                console.log("saving to cache");
                                cache.put(event.request, fetchResponse);
                            });
                        return response;
                    }).catch(function (error) {
                        return new Response("Application is not connected to the internet", {
                            status: 404,
                            statusText: "Application is not connected to the internet"
                        });
                    })
            })
    )
});



