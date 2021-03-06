let restaurants,
  neighborhoods,
  cuisines
let firstLoad = true
var newMap
var markers = []
/* test */
/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap() // added
  fetchNeighborhoods()
  fetchCuisines()
})

const channel = new BroadcastChannel('sw-messages')
channel.addEventListener('message', event => {
  console.log('Received', event.data)
  location.reload()
})

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error)
    } else {
      self.neighborhoods = neighborhoods
      fillNeighborhoodsHTML()
    }
  })
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select')
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option')
    option.innerHTML = neighborhood
    option.value = neighborhood
    select.append(option)
  })
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error)
    } else {
      self.cuisines = cuisines
      fillCuisinesHTML()
    }
  })
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select')

  cuisines.forEach(cuisine => {
    const option = document.createElement('option')
    option.innerHTML = cuisine
    option.value = cuisine
    select.append(option)
  })
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 12,
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

  updateRestaurants()
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select')
  const nSelect = document.getElementById('neighborhoods-select')

  const cIndex = cSelect.selectedIndex
  const nIndex = nSelect.selectedIndex

  const cuisine = cSelect[cIndex].value
  const neighborhood = nSelect[nIndex].value

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error)
    } else {
      resetRestaurants(restaurants)
      fillRestaurantsHTML()
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = []
  const ul = document.getElementById('restaurants-list')
  ul.innerHTML = ''

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove())
  }
  self.markers = []
  self.restaurants = restaurants
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list')
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant))
  })

  addMarkersToMap()
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li')

  // load images for srcset

  const image = document.createElement('img')
  image.className = 'restaurant-img'
  const imgurlbase = DBHelper.imageUrlForRestaurant(restaurant)
  const imgurl1x = imgurlbase + '-tiles_1x.jpg'
  const imgurl2x = imgurlbase + '-tiles_2x.jpg'
  image.src = imgurl1x
  image.srcset = `${imgurl1x} 300w, ${imgurl2x} 600w`
  image.alt = `An image of ${restaurant.name}`
  li.append(image)

  const div = document.createElement('div')
  div.className = 'restaurant-text-area'
  li.append(div)

  const name = document.createElement('h2')
  name.innerHTML = restaurant.name
  name.id = restaurant.name
  div.append(name)

  const neighborhood = document.createElement('p')
  neighborhood.innerHTML = restaurant.neighborhood
  div.append(neighborhood)

  const address = document.createElement('p')
  address.innerHTML = restaurant.address.split(',').shift(2)
  div.append(address)

  const zipcode = document.createElement('p')
  zipcode.innerHTML = restaurant.address.split(',').pop()
  div.append(zipcode)

  const more = document.createElement('button')
  more.innerHTML = 'View Details'
  more.setAttribute('aria-label', `view more details for ${restaurant.name}`)
  more.onclick = function () {
    const url = DBHelper.urlForRestaurant(restaurant)
    window.location = url
  }
  div.append(more)

  // favorite handling
  const isFavorite = restaurant.is_favorite // true or false

  const favoriteDiv = document.createElement('div')
  favoriteDiv.className = 'favorite-div'
  // const favoriteLabel = document.createElement('label')
  // favoriteLabel.innerHTML = `toggle ${restaurant.name} as a favorite`
  // favoriteLabel.id = `${restaurant.name}-toggle`
  // favoriteDiv.appendChild(favoriteLabel)

  const favoriteButton = document.createElement('button')
  favoriteButton.innerHTML = 'Add as Favorite'
  favoriteButton.setAttribute('class', 'favorite-button')
  favoriteButton.setAttribute('aria-label', `toggle ${restaurant.name} as favorite`)
  favoriteButton.onclick = event => toggleFavorite(restaurant.id, isFavorite)
  // favoriteButton.addEventListener('click', toggleFavorite(restaurant.id, isFavorite))
  favoriteDiv.append(favoriteButton)

  const favoriteIcon = document.createElement('button')
  favoriteIcon.setAttribute('class', 'favorite-icon-button')
  favoriteIcon.setAttribute('name', `toggle ${restaurant.name} as a favorite`)
  // favoriteIcon.id = `${restaurant.name}-toggle`
  favoriteIcon.setAttribute('aria-hidden', `true`)
  favoriteIcon.style['background-color'] = 'transparent'
  favoriteIcon.style.border = 'transparent'
  favoriteIcon.onclick = event => toggleFavorite(restaurant.id, isFavorite)
  const heart = document.getElementById('heart-parent').cloneNode(true)
  heart.style.display = 'inline'
  heart.removeAttribute('id')
  favoriteIcon.appendChild(heart)
  favoriteDiv.append(favoriteIcon)
  if (restaurant.is_favorite === true) {
    heart.classList.add('favorite')
  }
  div.append(favoriteDiv)

  return li
}

toggleFavorite = (id, favorite) => {
  console.log(`toggleFavorite called on restaurant #: ${id} with favorite status: ${favorite}`)
  if (favorite === true) { // unfavorite restaurant
    console.log('Unfavoriting restaurant')
    fetch(`http://localhost:1337/restaurants/${id}/?is_favorite=false`, { method: 'PUT' })
    //
  } else { // favorite restaurant
    console.log('Favoriting restaurant')
    fetch(`http://localhost:1337/restaurants/${id}/?is_favorite=true`, { method: 'PUT' })
  }
  window.location.reload()
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap)
    marker.on('click', onClick)
    function onClick () {
      window.location.href = marker.options.url
    }
    self.markers.push(marker)
  })
}
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */
