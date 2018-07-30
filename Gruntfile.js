module.exports = function(grunt) {
    // 1. All configuration goes here 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            dist: {
                src: [
                    'js/main.js',
                    'js/restaurant_info.js'
                ],
                dest: 'js/build/production.js',
            }
        }, 
        uglify: {
            build: {
                src: 'js/build/production.js',
                dest: 'js/build/production.min.js'
            }
        },
        imagemin: {
            dynamic: {
                files: [{
                    expand: true,
                    cwd: 'img/build',
                    src: ['**/*.jpg'],
                    dest: 'img/build/'
                }]
            }
        }, 
        responsive_images: {
            myTask: {
                options: {
                    // Task-specific options go here.
                    sizes: [{
                        name: "banner_1x",
                        width: 500,
                        height: 219,
                        quality: 77,
                        aspectRatio: false
                    },
                    {
                        name: "banner_2x",
                        width: 800,
                        height: 350,
                        quality: 77,
                        aspectRatio: false
                    },
                    {
                        name: "tile_1x",
                        width: 300,
                        quality: 77,
                    },
                    {
                        name: 'tile_2x',
                        width: 600,
                        quality: 77,
                    }]
                },
                files: [{
                    expand: true,
                    src: ['**.{jpg,png,gif}'],
                    cwd: 'img/',
                    //dest: 'img/tmp/'
                    custom_dest: 'img/build/{%= name %}'
                }]
            }
        }

    });

    // 3. Where we tell Grunt we plan to use this plug-in. 
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-responsive-images');


    //4. Where we tell Grunt what to do when we type "grunt" into the terminal. 
    grunt.registerTask('default', ['concat', 'responsive_images', 'imagemin']);

};