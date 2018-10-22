# Mobile Web Specialist Certification Course
---
#### _Three Stage Course Material Project - Restaurant Reviews_

This site presents a number of restaurants on a Mapbox map. Restaurants can be filtered by neighbordhood, and cuisine type. Clicking on a restaurant presents the user with the restaurant's address, hours, and customer reviews. 

## Prerequisites

- Mapbox API key
- Python
- NPM 
- leaflet.js
- Grunt 
- Gulp
- graphicsmagick
- Grunt-responsive-images 
- indexedDB
- Yeoman 
- Browserify
 
## Installing

- Replace the the line `<your MAPBOX API KEY HERE>` with your Mapbox API key.
- Configure grunt to crop images into tiles and banners, and to output 1x and 2x versions of each. 
- Download and install Yeoman. 
- Create a Yeoman webapp using the 'yo webapp' command 
- Move the contents of the app from stage 1 into the app folder in the new Yeoman project.
- Open Yeoman's Gulp file and make sure pathnames found within tasks match the pathnames in your app folder (e.g. change '/scripts/' to '/js/')
- Follow the following guide to configure Browserify. This will allow you to import the idb library: https://github.com/yeoman/generator-webapp/blob/master/docs/recipes/browserify.md
- Replace XHR calls in the dbhelper.js file with Fetch. 
- Follow Lighthouse's recommendations to get the scores to passing. 

## Runtime Environment
- Download the provided Sails server. Follow the server readme and run the server using the command node server.
- Open the dbhelper.js file and change the value of the port variable to the Sails port (1337 by default).

## Acknowledgments
- Thanks to Doug Brown and Matt Gaunt for their Service Worker tutorials. 
