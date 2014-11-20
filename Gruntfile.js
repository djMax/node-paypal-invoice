'use strict';


module.exports = function (grunt) {

    grunt.initConfig({
        jshint: {
            files: ['controllers/**/*.js', 'lib/**/*.js', 'models/**/*.js'],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        clean: {
            'tmp': 'tmp',
            'dist': 'dist'
        },
        mochacli: {
            src: ['test/*.js'],
            options: {
                globals: ['chai'],
                timeout: 6000,
                ignoreLeaks: false,
                ui: 'bdd',
                reporter: 'spec'
            }
        },
        browserify: {
            dist: {
                files: {
                    'dist/paypal-invoice.js': ['index.js']
                }
            },
            options: {
                bundleOptions: {
                    standalone: 'Invoice'
                }
            }
        },
        uglify: {
            dist: {
                files: {
                    'dist/paypal-invoice.min.js': ['dist/paypal-invoice.js']
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-cli');
    grunt.loadNpmTasks('grunt-copy-to');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('build', ['jshint', 'browserify', 'uglify']);
    grunt.registerTask('test', ['jshint', 'mochacli']);

};
