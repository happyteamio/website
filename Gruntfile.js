module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  var PathConfig = require('./grunt-settings.js');

  // tasks
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    config: PathConfig,
    //clean files
    clean: {
      options: { force: true },
      temp: {
        src: ["<%= config.cssDir %>**/*.map",
              "<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css.map"]
      }
    },

    postcss: {
      dev: {
        options: {
          map: true,
          processors: [
            require('autoprefixer-core')({browsers: ['last 4 version', 'Android 4']})
          ]
        },
        src: ['<%= config.cssDir %>*.css',
              '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css',
              ]
      },
      dist: {
        options: {
          map: false,
          processors: [
            require('autoprefixer-core')({browsers: ['last 4 version', 'Android 4']})
          ]
        },
        src: ['<%= config.cssDir %>*.css',
              '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css',
              ]
      }
    },

    //sass
    sass: {
      options: PathConfig.hasBower,
      dev: {
        options: {
          sourceMap: true,
          style: 'nested'
        },
        files: [
          {
            expand: true,
            cwd: '<%= config.sassDir %>',
            src: ['**/*.scss', '!<%= config.sassMainFileName %>.scss'],
            dest: '<%= config.cssDir %>',
            ext: '.css'
          },
          {
            src: '<%= config.sassDir %><%= config.sassMainFileName %>.scss',
            dest: '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css'
          }
        ]
      },
      dist: {
        options: {
          sourceMap: false,
          style: 'nested'
        },
        files: [
          {
            expand: true,
            cwd: '<%= config.sassDir %>',
            src: ['**/*.scss', '!<%= config.sassMainFileName %>.scss'],
            dest: '<%= config.cssDir %>',
            ext: '.css'
          },
          {
            src: '<%= config.sassDir %><%= config.sassMainFileName %>.scss', 
            dest: '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css'
          }
        ]
      }
    },

    csscomb: {
      all: {
        expand: true,
        src: ['<%= config.cssDir %>*.css', 
              '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css',
              ],
        ext: '.css'
      },
      dist: {
        expand: true,
        files: {
          '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css' : '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css'
        },
      }
    },

    cmq: {
      options: {
        log: false
      },
      all: {
        files: [
          {
            expand: true,
            src: ['**/*.css', '!bootstrap.css'],
            cwd: '<%= config.cssDir %>',
            dest: '<%= config.cssDir %>'
          }
        ]
      },
      dist: {
        files: {
          '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css' : '<%= config.cssMainFileDir %><%= config.cssMainFileName %>.css'
        },
      }
    },

    cssmin: {
        target: {
          files: [{
            expand: true,
            cwd: '<%= config.cssMainFileDir %>',
            src: ['*.css', '!*.min.css'],
            dest: '<%= config.cssMainFileDir %>',
            ext: '.min.css'
          }]
        }
      },

  concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: ['themes/happyteam/src/js/jquery.main.js',
        'themes/happyteam/src/js/jquery.cookiesdirective.js', 'themes/happyteam/src/js/document.js'],
        dest: 'themes/happyteam/static/js/jsbundle.js'
      }
    },

  uglify: {
    options: {
      banner: '/*! jsbundle <%= grunt.template.today("dd-mm-yyyy") %> */\n'
    },
    dist: {
      files: {
        'themes/happyteam/static/js/jsbundle.min.js': ['<%= concat.dist.dest %>']
      }
    }
  }

  });

// run task
  grunt.registerTask('default', ['dist']);

  grunt.registerTask('jsbundle', ['concat', 'uglify']);
  grunt.registerTask('cssbeauty', ['sass:dist', 'cmq:dist', 'postcss:dist', 'csscomb:dist', 'cssmin']);
  //final build
  grunt.registerTask('dist', ['clean:temp', 'cssbeauty']);
};



