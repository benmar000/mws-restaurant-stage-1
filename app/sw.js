// import idb from 'idb'
importScripts('/js/idb.js')
importScripts('/js/store.js')
importScripts('/js/dbhelper.js')

// import { resolve } from 'dns'

var dbPromise = idb.open('mws-db', 1, function (upgradeDb) {
  if (!upgradeDb.objectStoreNames.contains('restaurants')) {
    var restaurantsOS = upgradeDb.createObjectStore('restaurants', { keyPath: 'id' })
  }
  if (!upgradeDb.objectStoreNames.contains('reviews')) {
    upgradeDb.createObjectStore('reviews', { keyPath: 'id' })
  }

  if (!upgradeDb.objectStoreNames.contains('outbox')) {
    upgradeDb.createObjectStore('outbox', { autoIncrement: true })
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
  '/js/store.js',
  '/js/idb.js',
  '/index.html',
  '/restaurant.html'
  // '/browser-sync/browser-sync-client.js?v=2.24.7'
]
const channel = new BroadcastChannel('sw-messages')

self.addEventListener('install', function (event) {
  console.log('Service worker is installing')
  event.waitUntil(
    caches.open(siteCache)
      .then(function (cache) {
        console.log('Opening cache')
        return cache.addAll(urlsToCache)
      }).then(() => channel.postMessage({ title: 'Hello from SW' }))
      .catch(function (error) {
        console.error('Failed to open cache with error: ', error)
      })
  )
})

self.addEventListener('sync', (event) => {
  console.log('sw listening to background sync')
  if (event.tag === 'favoriteSync') {
    //
  } else if (event.tag === 'outbox') {
    reviewOutbox(event)
  }
})

function reviewOutbox (event) {
  event.waitUntil(
    store.outbox('readonly').then((outbox) => {
      return outbox.getAll()
    }).then((reviews) => {
    // post reviews to server
      console.log('sw posting to server')
      return Promise.all(reviews.map((review) => {
        return fetch('http://localhost:1337/reviews/', {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify(review)
        }).then((response) => {
          return response.json()
        }).then((data) => {
          console.log('SW Post data: ')
          console.log(data)
          if (data.createdAt) {
            console.log('background sync fetch got successful response. Deleting from outbox')
            return store.outbox('readwrite')
              .then((outbox) => outbox.clear())
              .then(() => {
                console.log('updating reviews list by fetching from server')
                fetch(`http://localhost:1337/reviews/?restaurant_id=${review.restaurant_id}`)
                  .then((response) => response.json())
                  .then((json) => {
                    return dbPromise
                      .then(function (db) {
                        var tx = db.transaction('reviews', 'readwrite').objectStore('reviews')
                        tx.put({ id: review.restaurant_id, data: json })
                        console.log('BG Sync saved JSON to db')
                        // const channel = new BroadcastChannel('sw-messages')
                        channel.postMessage({ title: 'Hello from SW' })
                      })
                  })
              })
          }
        })
      }))
    }).catch((error) => console.log(error))
  )
}

function send_message_to_all_clients (msg) {
  clients.matchAll().then(clients => {
    clients.forEach(client => {
      send_message_to_client(client, msg).then(m => console.log('SW Received Message: ' + m))
    })
  })
}

// self.addEventListener('message', function (event) {
//   console.log('SW Received Message: ')
//   console.log('sw sending POST')
//   fetch('http://localhost:1337/reviews/', {
//     method: 'POST',
//     mode: 'cors',
//     headers: {
//       'Content-Type': 'application/json; charset=utf-8'
//     },
//     body: JSON.stringify(event.data)
//   }).catch(() => {
//     this.console.log('sw could not post review to server. Saving to idb')
//     dbPromise.then(function (db) {
//       var tx = db.transaction('reviewsToPost', 'readwrite')
//       var store = tx.objectStore('reviewsToPost')
//       store.put({ data: event.data })
//     })
//   })
// })

self.addEventListener('fetch', function (event) {
  console.log('Service worker handling fetch request')
  var requestURL = new URL(event.request.url)
  if (requestURL.port === '1337') {
    console.log('SW handling fetch to:')
    console.log(requestURL)
    if (requestURL.href.includes('is_favorite')) {
      return favoriteToggle(event)
    }

    var id = -1
    if (requestURL.href.match(/\d+$/)) {
      id = requestURL.href.match(/\d+$/)[0]
    }
    console.log(`SW Fetching ID: ${id}`)
    var type
    if (requestURL.href.includes('restaurants')) {
      type = 'restaurants'
      dbRequest(event, id, type)
    // } else if (requestURL.href.includes('reviews')) {
    } else {
      console.log('SW calling dbRequest for reviews JSON')
      type = 'reviews'
      dbRequest(event, id, type)
    }
  } else {
    cacheRequest(event)
  }
})

const favoriteToggle = function (event) {
  console.log('SW handling PUT request')
  console.log(event.request)
  let favorite
  if (event.request.url.includes('true')) {
    favorite = true
  } else {
    favorite = false
  }
  const id = event.request.url.split('/')[4]
  console.log(`Id is: ${id}`)
  fetch(event.request)
    .then(response => response.json())
    .then(json => {
      return dbPromise
        .then(db => {
          const tx = db.transaction('restaurants', 'readwrite')
          const store = tx.objectStore('restaurants')
          return store.openCursor()
            .then(function logItems (cursor) {
              if (!cursor) {
                return
              }
              console.log(`Restaurant id is:${id}`)
              const cursorRestaurantId = parseInt(id) - 1
              // for (var field in cursor.value) {
              const updateData = cursor.value
              console.log(updateData['data'][cursorRestaurantId].is_favorite)
              updateData['data'][cursorRestaurantId].is_favorite = favorite
              cursor.update(updateData)
              // }
            }).then(() => console.log('Done cursoring'))
        // store.put({ id: -1, data.id: json })
        // console.log('saved JSON to db')
        })
    })

  // event.respondWith(
  //   fetch(event.request)
  //     .then(response => response.json())
  //     .then(json => {
  //       return dbPromise
  //         .then(db => {
  //           const tx = db.transaction('restaurants', 'readwrite')
  //           const store = tx.objectStore('restaurants')
  //           return store.openCursor(id)
  //             .then(cursor => {
  //               console.log('Cursored at:', cursor.key)
  //               for (var field in cursor.value) {
  //                 console.log(cursor.value[field])
  //               }
  //               return json
  //             }).then(() => console.log('Done cursoring'))
  //           // store.put({ id: -1, data.id: json })
  //           // console.log('saved JSON to db')
  //         })
  //     }).then((finalResponse) => {
  //       return new Response(JSON.stringify(finalResponse))
  //     }).catch(error => console.error(error))

  // )
}

var dbRequest = function (event, id, type) {
  event.respondWith(dbPromise.then(function (db) {
    var tx = db.transaction(type)
    var store = tx.objectStore(type)
    return store.get(id)
  }).then(function (data) {
    return (data && data.data) || fetch(event.request)
      .then(function (response) {
        // console.log('dbRequest response is: ')
        // console.log(response.clone())
        return response.json()
      })
      .then(function (json) {
        return dbPromise
          .then(function (db) {
            var tx = db.transaction(type, 'readwrite')
            var store = tx.objectStore(type)
            store.put({ id: id, data: json })
            console.log('saved JSON to db')
            return json
          })
      })
  }).then(function (finalResponse) {
    // var jsonString = JSON.stringify(response)
    // console.log('SW jsonString: ')
    // console.log(jsonString)
    return new Response(JSON.stringify(finalResponse))
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
