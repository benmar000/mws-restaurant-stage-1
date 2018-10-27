import idb from 'idb'
// import { resolve } from 'dns'

var dbPromise = idb.open('mws-db', 1, function (upgradeDb) {
  if (!upgradeDb.objectStoreNames.contains('restaurants')) {
    var restaurantsOS = upgradeDb.createObjectStore('restaurants', { keyPath: 'id' })
  }
})

var siteCache = 'mws-cache-v1'
var urlsToCache = [
  '/',
  '/css/styles.css',
  '/js/main.js',
  '/js/restaurant_info.js',
  '/js/dbhelper.js',
  '/js/sw/register.js',
  '/index.html',
  '/restaurant.html'
  // '/browser-sync/browser-sync-client.js?v=2.24.7'
]

self.addEventListener('install', function (event) {
  console.log('Service worker is installing')
  event.waitUntil(
    caches.open(siteCache)
      .then(function (cache) {
        console.log('Opening cache')
        return cache.addAll(urlsToCache)
      }).catch(function (error) {
        console.error('Failed to open cache with error: ', error)
      })
  )
})

self.addEventListener('fetch', function (event) {
  console.log('Service worker handling fetch request')
  var requestURL = new URL(event.request.url)

  if (requestURL.port === '1337') {
    var id = -1
    if (requestURL.href.match(/\d+$/)) {
      id = requestURL.href.match(/\d+$/)[0]
    }
    // var id = requestURL.href.match(/\d+$/)[0] || -1;
    console.log(`SW Fetching ID: ${id}`)
    //
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
    // // console.log(`data : ${data} and data.data is: ${data.data}`)
    // var message = 'Message: '
    // if (data) {
    //   message += 'Retrieved data from DB'
    //   return (data && data.data)
    // } else {
    //   message += 'SW fetching JSON'
    //   fetch(event.request)
    //     .then(function (fetchResponse) {
    //       // console.log(`//SW Fetch response is:`)
    //     // console.log(fetchResponse.clone())
    //       return fetchResponse.json()
    //     })
    //     .then(function (json) {
    //       return dbPromise.then(function (db) {
    //         var tx = db.transaction('restaurants', 'readwrite')
    //         var store = tx.objectStore('restaurants')
    //         store.put({ id: id, data: json })
    //         return json
    //       })
    //     })
    // }
    // console.log(message)
    return (data && data.data) || fetch(event.request)
      .then(function (response) {
        return response.json()
      })
      .then(function (json) {
        return dbPromise
          .then(function (db) {
            var tx = db.transaction('restaurants', 'readwrite')
            var store = tx.objectStore('restaurants')
            store.put({ id: id, data: json })
            console.log('saved JSON to db')
            // parseDBData(json)
            return json
          })
      })
  }).then(function (response) {
    // var jsonString = JSON.stringify(response)
    // console.log('SW jsonString: ')
    // console.log(jsonString)
    return new Response(JSON.stringify(response))
  }).catch(function (error) {
    console.error(`Received error: "${error}" when fetching data`)
    return new Response(`Received error: ${error} when fetching data`, { status: 500 })
  }))
}

var cacheRequest = function (event) {
  // event.respondWith(
  //   caches.match(event.request)
  //     .then(function (response) {
  //       // Found in cache
  //       if (response) {
  //         return response
  //       } else {
  //       // Not found in catch

  //         // Clone the request since it's a stream that can only be used once.
  //         var fetchRequest = event.request.clone()

  //         return fetch(fetchRequest)
  //           .then(function (response) {
  //           // check if response is valid
  //           // response type 'basic' prevents third party resources from saving
  //             if (!response || response.status !== 200 || response.type !== 'basic') {
  //               return response
  //             }
  //             // Clone the response since it's a stream that can only be used once
  //             var fetchResponse = response.clone()

  //             caches.open(siteCache)
  //               .then(function (cache) {
  //                 console.log('saving to cache')
  //                 // This prevents cache.put from attempting to cache POST requests
  //                 if (fetchResponse.url.indexOf('browser-sync') === -1) {
  //                   cache.put(event.request, fetchResponse)
  //                 }
  //                 return fetchResponse
  //               })
  //             return response
  //           })
  event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        if (response) {
          return response // if valid response is found in cache return it
        } else {
          return fetch(event.request) // fetch from internet
            .then(function (response) {
              return caches.open(siteCache)
                .then(function (cache) {
                  cache.put(event.request.url, response.clone()) // save the response for future
                  return response // return the fetched data
                })
            })
            .catch(function (error) {
              console.error(error)
              return new Response('Application is not connected to the internet', {
                status: 404,
                statusText: 'Application is not connected to the internet :('
              })
            })
        }
      })
  )
}
