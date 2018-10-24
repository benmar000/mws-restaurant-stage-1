import idb from 'idb'

var dbPromise = idb.open('mws-db', 1, function (upgradeDb) {
  if (!upgradeDb.objectStoreNames.contains('restaurants')) {
    var restaurantsOS = upgradeDb.createObjectStore('restaurants', { keyPath: 'id' })
  }
})

var siteCache = 'mws-cache-v1'
var urlsToCache = [
  '/css/styles.css',
  '/js/main.js',
  '/js/restaurant_info.js',
  '/js/dbhelper.js',
  '/js/sw/register.js',
  '/index.html',
  '/restaurant.html'
]

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(siteCache)
      .then(function (cache) {
        console.log('Opening cache')
        return cache.addAll(urlsToCache)
      }).catch(function (error) {
        console.log('Failed to open cache with error: ', error)
      })
  )
})

self.addEventListener('fetch', function (event) {
  var requestURL = new URL(event.request.url)

  if (requestURL.port === '1337') {
    // console.log(`url match: ${event.request.url.match(/\d+$/)}`);
    // var id = event.request.url.match(/\d+$/)[0] || -1;
    // console.log(`id is: ${id}`)
    var id = -1
    dbRequest(event, id)
  } else {
    cacheRequest(event)
  }
})

var dbRequest = function (event, id) {
  event.respondWith(dbPromise.then(function (db) {
    var tx = db.transaction('restaurants')
    var store = tx.objectStore('restaurants')
    return store.get(id)
  }).then(function (data) {
    // console.log(`data : ${data} and data.data is: ${data.data}`)
    if (data) {
      return data && data.data
    }
    fetch(event.request)
      .then(function (fetchResponse) {
        return fetchResponse.json()
      })
      .then(function (json) {
        return dbPromise.then(function (db) {
          var tx = db.transaction('restaurants', 'readwrite')
          var store = tx.objectStore('restaurants')
          store.put({ id: id, data: json })
          return json
        })
      })
  }).then(function (response) {
    return new Response(JSON.stringify(response))
  }).catch(function (error) {
    console.error(`Received error: "${error}" when fetching data`)
    return new Response(`Received error: ${error} when fetching data`, { status: 500 })
  }))
}

var cacheRequest = function (event) {
  event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        // Found in cache
        if (response) {
          return response
        }
        // Not found in catch

        // Clone the request since it's a stream that can only be used once.
        var fetchRequest = event.request.clone()

        return fetch(fetchRequest)
          .then(function (response) {
            // check if response is valid
            // response type 'basic' prevents third party resources from saving
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }
            // Clone the response since it's a stream that can only be used once
            var fetchResponse = response.clone()

            caches.open(siteCache)
              .then(function (cache) {
                console.log('saving to cache')
                // This prevents cache.put from attempting to cache POST requests
                if (fetchResponse.url.indexOf('browser-sync') === -1) {
                  cache.put(event.request, fetchResponse)
                }
                return fetchResponse
              })
            return response
          }).catch(function (error) {
            console.log(error)
            return new Response('Application is not connected to the internet', {
              status: 404,
              statusText: 'Application is not connected to the internet :('
            })
          })
      })
  )
}
