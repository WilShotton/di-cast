
module.exports = function(grunt) {

    "use strict";

    var jsHintOptions = grunt.file.readJSON('.jshintrc');

    grunt.initConfig({

        package: grunt.file.readJSON('package.json'),

        meta: {

            js: {
                src: 'src',
                dist: 'dist',
                tests: 'tests/specs'
            },

            bin: {
                complexity: 'bin/complexity',
                coverage: 'bin/coverage'
            },

            server: {
                coverage: {
                    host: 'localhost',
                    port: 4000
                }
            }
        },

        connect: {

            coverage: {
                options: {
                    hostname: '<%= meta.server.coverage.host %>',
                    port: '<%= meta.server.coverage.port %>',
                    middleware: function(connect, options) {

                        var src = grunt.file.expand(grunt.config.get('jasmine.coverage.src')).map(function(file) {
                                return '/' + file;
                            }),
                            stat = connect.static(options.base);

                        return [function(request, response, next) {

                            if (src.indexOf(request.url) > -1) {
                                request.url = '/.grunt/grunt-contrib-jasmine' + request.url;
                            }

                            return stat.apply(this, arguments);
                        }];
                    }
                }
            }
        },

        copy: {
            dist: {
                files: [{
                    cwd: '<%= meta.js.src %>/',
                    src: 'di-cast.js',
                    dest: '<%= meta.js.dist %>/',
                    expand: true
                }]
            }
        },

        jasmine: {

            coverage: {

                src: [
                    '<%= meta.js.src %>/**/*.js'
                ],

                options: {

                    specs: '<%= meta.js.tests %>/**/*.spec.js',

                    host: 'http://<%= meta.server.coverage.host %>:<%= meta.server.coverage.port %>/',

                    template: require('grunt-template-jasmine-istanbul'),
                    templateOptions: {
                        coverage: '<%= meta.bin.coverage %>/coverage.json',
                        report: [
                            {
                                type: 'html',
                                options: {
                                    dir: '<%= meta.bin.coverage %>/html'
                                }
                            }, {
                                type: 'text-summary'
                            }
                        ],
                        replace: false,

                        template: require('grunt-template-jasmine-requirejs'),
                        templateOptions: {

                            requireConfig: {

                                baseUrl: './<%= meta.js.src %>/'
                            }
                        }
                    }
                }
            },

            dist: {

                src: [
                    '<%= meta.js.dist %>/**/*.js'
                ],

                options: {

                    specs: '<%= meta.js.tests %>/**/*.spec.js',

                    template: require('grunt-template-jasmine-requirejs'),
                    templateOptions: {

                        requireConfig: {

                            baseUrl: './<%= meta.js.src %>/'
                        }
                    }
                }
            }
        },

        jshint: {

            all: {

                options: jsHintOptions,

                src: [
                    'src/**/*.js',
                    'tests/**/*.js',

                    '!src/libs/*'
                ]
            }
        },

        plato: {
            all: {

                options : {
                    jshint : jsHintOptions
                },

                files: {
                    '<%= meta.bin.complexity %>': [
                        '<%= meta.js.src %>/**/*.js'
                    ]
                }
            }
        },

        uglify: {
            dist: {
                options: {
                  report: 'gzip'
                },
                files: {
                    'dist/di-cast.min.js': ['src/di-cast.js']
                }
            }
        },

        watch: {

            all: {

                files: ['src/**/*'],
                tasks: ['default']
            }
        },

        yuidoc: {
            compile: {
                name: '<%= package.name %>',
                description: '<%= package.description %>',
                version: '<%= package.version %>',
                options: {
                    paths: 'src/',
                    outdir: 'bin/docs/'
                }
            }
        }
    });

    // See following link for more info on the Jasmine / Istanbul / Require template config
    // https://github.com/maenu/grunt-template-jasmine-istanbul-example/tree/requirejs-client

    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-yuidoc');

    grunt.loadNpmTasks('grunt-plato');

    grunt.registerTask('doc', ['yuidoc']);
    grunt.registerTask('test', ['connect:coverage', 'jasmine:coverage']);
    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('dist', ['jshint', 'plato', 'copy:dist', 'uglify:dist', 'jasmine:dist']);
};
