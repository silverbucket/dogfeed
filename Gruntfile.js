module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ['tmp/', 'build/'],
    concat: {
     options: {
        // define a string to put between each file in the concatenated output
        separator: ';',
        stripBanners: true
      },
      dogfeed: {
        // the files to concatenate
        src: ['res/**/*.js'],
        // the location of the resulting JS file
        dest: 'tmp/<%= pkg.name %>.js'
      },
      dogfeedCSS: {
        // the files to concatenate
        src: ['res/**/*.css', 'vendor/**/*.css'],
        // the location of the resulting JS file
        dest: 'tmp/style.css'
      },
      remotestorage: {
        // the files to concatenate
        src: ['vendor/remotestorage/*.js'],
        // the location of the resulting JS file
        dest: 'tmp/remotestorage.js'
      },
      sockethub: {
        // the files to concatenate
        src: ['vendor/sockethub-client/sockethub-client.js'],
        // the location of the resulting JS file
        dest: 'tmp/sockethub-client.js'
      },
      angular: {
        // the files to concatenate
        src: ['vendor/angular.min.js'],
        // the location of the resulting JS file
        dest: 'build/res/js/angular.min.js'
      },
      bootstrap: {
        // the files to concatenate
        src: ['vendor/bootstrap/js/bootstrap.min.js'],
        // the location of the resulting JS file
        dest: 'build/res/js/bootstrap.min.js'
      },
      jquery: {
        // the files to concatenate
        src: ['vendor/jquery.min.js'],
        // the location of the resulting JS file
        dest: 'build/res/js/jquery.min.js'
      }
    },
    uglify: {
      options: {
        compress: true,
        banner: '/*! built for <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      dist: {
        files: {
          'build/res/js/dogfeed.min.js': ['<%= concat.dogfeed.dest %>'],
          'build/res/js/remotestorage.min.js': ['<%= concat.remotestorage.dest %>'],
          'build/res/js/sockethub-client.min.js': ['<%= concat.sockethub.dest %>']
        }
      }
    },
    cssmin: {
      minify: {
        expand: true,
        cwd: 'build/',
        src: ['*.css', '!*.min.css'],
        dest: 'build/res/css/',
        ext: '.min.css'
      }
    },
    copy: {
      main: {
        files: [
          //{expand: true, src: ['path/*'], dest: 'dest/', filter: 'isFile'}, // includes files in path
          {expand: true, src: ['*.html'], dest: 'build/'}, // includes files in path and its subdirs
          {expand: true, src: ['*.ico'], dest: 'build/'}, // includes files in path and its subdirs
          {expand: true, src: ['*.png'], dest: 'build/'}, // includes files in path and its subdirs
          {expand: true, src: ['*.jpg'], dest: 'build/'}, // includes files in path and its subdirs
          {expand: true, src: ['res/img/*'], dest: 'build/', filter: 'isFile'} // includes files in path and its subdirs
          //{expand: true, cwd: 'path/', src: ['**'], dest: 'dest/'}, // makes all src relative to cwd
          //{expand: true, flatten: true, src: ['path/**'], dest: 'dest/', filter: 'isFile'} // flattens results to a single level
        ]
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');

  // Default task(s).
  grunt.registerTask('default', ['clean', 'concat', 'uglify', 'cssmin', 'copy']);

};
