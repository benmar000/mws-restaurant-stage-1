let restaurant
let reviews
var newMap

/**
 * Initialize map as soon as the page is loaded.
 */

document.addEventListener('DOMContentLoaded', function (event) {
  if ('serviceWorker' in navigator) {
    // is it necessary to register sw here?
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      if ('sync' in reg) {
        console.log('starting browser sync')
        const form = document.querySelector('form')
        const restaurantId = form.querySelector('#reviewRestaurantId')
        const reviewName = form.querySelector('#reviewName')
        const reviewRating = form.querySelector('#reviewRating')
        const reviewComment = form.querySelector('#reviewComment')

        form.addEventListener('submit', (event) => {
          console.log('listening to submit event')
          event.preventDefault()
          const reviewFormData = {
            'restaurant_id': restaurantId.value,
            'name': reviewName.value,
            'rating': reviewRating.value,
            'comments': reviewComment.value
          }
          store.outbox('readwrite')
            .then((outbox) => outbox.put(reviewFormData))
            .then(() => {
              // Clear form and Do background sync!
              reviewName.value = ''
              reviewRating.value = ''
              reviewComment.value = ''
              return reg.sync.register('outbox')
            }).catch((error) => {
              console.log(`Something went wrong with the db or sync reg: ${error}`)
              console.log(form.submit())
            })
        })
      }
    }).catch(function (err) {
      console.error(err) // the Service Worker didn't install correctly
    })
  }
  initMap()
})

// window.addEventListener('load', function () {
//   function updateOnlineStatus (event) {
//     if (navigator.onLine) {
//       // handle online status
//       console.log('App is online - have SW upload pending reviews to server')
//       navigator.serviceWorker.controller.postMessage('online')
//     } else {
//       // handle offline status
//       console.log('App is offline')
//     }
//   }

//   window.addEventListener('online', updateOnlineStatus)
//   window.addEventListener('offline', updateOnlineStatus)
// })

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error)
    } else {
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      })
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoiYmVubWFyMDAwIiwiYSI6ImNqamE5MHNqazNmNGUzcGxmajU5M3BocmQifQ.Fu2yIDoJw1NW4A24r4T2rw',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
      }).addTo(newMap)
      fillBreadcrumb()
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap)
    }
  })
}

/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return
  }
  const id = getParameterByName('id')
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null)
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant
      if (!restaurant) {
        console.error(error)
        return
      }
      fillRestaurantHTML()
      callback(null, restaurant)
    })
    DBHelper.fetchReviews((error, reviews) => {
      console.log('restaurant_info.js called DBHelper.fetchReviews')
      self.reviews = reviews
      if (!reviews) {
        console.error(error)
      }
      fillReviewsHTML()
    }, id)
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name')
  name.innerHTML = restaurant.name

  const address = document.getElementById('restaurant-address')
  address.innerHTML = restaurant.address

  // fill image
  const image = document.getElementById('restaurant-img')
  image.className = 'restaurant-img'
  const imgurlbase = DBHelper.imageUrlForRestaurant(restaurant)
  const imgurl1x = imgurlbase + '-banners_1x.jpg'
  const imgurl2x = imgurlbase + '-banners_2x.jpg'
  image.src = imgurl1x
  image.srcset = `${imgurl1x} 300w, ${imgurl2x} 600w`
  image.alt = `An image of ${restaurant.name}`
  // image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine')
  cuisine.innerHTML = restaurant.cuisine_type

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML()
  }
  // fill reviews
  // fillReviewsHTML()
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours')
  for (let key in operatingHours) {
    const row = document.createElement('tr')

    const day = document.createElement('td')
    day.innerHTML = key
    row.appendChild(day)

    const time = document.createElement('td')
    time.innerHTML = operatingHours[key]
    row.appendChild(time)

    hours.appendChild(row)
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.reviews) => {
  // console.log('fillReviewsHTML reviews: ')
  // console.log(self.reviews)
  // console.log(reviews)
  const container = document.getElementById('reviews-container')
  const title = document.createElement('h3')
  title.innerHTML = 'Reviews'
  container.appendChild(title)

  if (!reviews) {
    const noReviews = document.createElement('p')
    noReviews.innerHTML = 'No reviews yet!'
    container.appendChild(noReviews)
    return
  }
  const ul = document.getElementById('reviews-list')
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review))
  })
  container.appendChild(ul)
}

// createReviewsForm = () => {
//   const container = document.getElementById('reviews-form-container')
//   const title = document.createElement('h3')
//   title.innerHTML = 'Submit a new review:'
//   container.appendChild(title)

//   const form = document.createElement('form')
//   form.setAttribute('id', 'reviewsForm')
//   form.setAttribute('method', 'post')

//   const div1 = document.createElement('div')
//   const name = document.createElement('input')
//   const label = document.createElement('label')
//   const span = document.createElement('span')

//   label.innerHTML = "Your Name"
//   name.set
//   name.setAttribute({'value', 'Enter your name'})
//   div1.appendChild(name)
//   form.appendChild(div1)

//   const div2 = document.createElement('div')
//   const rating = document.createElement('input')
//   rating.setAttribute('type', 'number')
//   rating.setAttribute('min', 0)
//   rating.setAttribute('max', 5)
//   rating.setAttribute('value', 'Rating from 1 - 10')
//   div2.appendChild(rating)
//   form.appendChild(div2)

//   const div3 = document.createElement('div')
//   const comments = document.createElement('input')
//   comments.setAttribute('type', 'text')
//   comments.setAttribute('value', 'Your comments')
//   div3.appendChild(comments)
//   form.appendChild(div3)

//   const div4 = document.createElement('div')
//   const submit = document.createElement('input')
//   submit.setAttribute('type', 'submit')
//   submit.setAttribute('value', 'Submit')
//   div4.appendChild(submit)
//   form.appendChild(div4)

//   container.appendChild(form)
// }

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li')
  const name = document.createElement('p')
  name.innerHTML = review.name
  li.appendChild(name)

  const date = document.createElement('p')
  date.innerHTML = new Date(review.updatedAt).toLocaleString() // review.date
  li.appendChild(date)

  const rating = document.createElement('p')
  rating.innerHTML = `Rating: ${review.rating}`
  li.appendChild(rating)

  const comments = document.createElement('p')
  comments.innerHTML = review.comments
  li.appendChild(comments)

  return li
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb')
  const li = document.createElement('li')
  li.innerHTML = restaurant.name
  breadcrumb.appendChild(li)
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url) { url = window.location.href }
  name = name.replace(/[\[\]]/g, '\\$&')
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`)

  const results = regex.exec(url)
  if (!results) { return null }
  if (!results[2]) { return '' }
  return decodeURIComponent(results[2].replace(/\+/g, ' '))
}
