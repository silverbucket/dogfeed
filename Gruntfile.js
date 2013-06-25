module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
     options: {
        // define a string to put between each file in the concatenated output
        separator: ';',
        stripBanners: true
      },
      app: {
        src: ['res/js/dogfeed.js',
              'res/js/ngRSS.js',
              'res/js/ngRemoteStorage.js',
              'vendor/sockethub-client/angular/ngSockethubClient.js'],
        dest: 'build/app.js.tmp'
      },
      modules: {
        src: ['vendor/remotestorage/*-*.js'],
        dest: 'build/remotestorage-modules.js.tmp'
      },
      sockethub: {
        src: ['vendor/sockethub-client/sockethub-client.js'],
        dest: 'build/sockethub-client.js.tmp'
      },
      css: {
        src: ['res/**/*.css'],
        dest: 'build/app.css.tmp'
      },
      flatuiCSS: {
        src: ['vendor/flat-ui/*.css'],
        dest: 'build/flat-ui.css.tmp'
      }
    },
    copy: {
      main: {
        files: [
          {expand: true, src: ['*.html'], dest: 'build/'}, // includes files in path and its subdirs
          {expand: true, src: ['*.ico'], dest: 'build/'}, // includes files in path and its subdirs
          {expand: true, src: ['*.png'], dest: 'build/'}, // includes files in path and its subdirs
          {expand: true, src: ['*.jpg'], dest: 'build/'}, // includes files in path and its subdirs
          {expand: true, src: ['res/img/*'], dest: 'build/', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/bootstrap/img/glyphicons-halflings-white.png'], dest: 'build/res/img/glyphicons-halflings-white.png', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/bootstrap/img/glyphicons-halflings.png'], dest: 'build/res/img/glyphicons-halflings.png', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/jquery.min.js'], dest: 'build/res/js/jquery.min.js', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/angular.min.js'], dest: 'build/res/js/angular.min.js', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/remotestorage/remotestorage.min.js'], dest: 'build/res/js/remotestorage.min.js', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/bootstrap/js/bootstrap.min.js'], dest: 'build/res/js/bootstrap.min.js', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/bootstrap/js/bootstrap-responsive.min.js'], dest: 'build/res/js/bootstrap-responsive.min.js', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/bootstrap/css/bootstrap.min.css'], dest: 'build/res/css/bootstrap.min.css', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/bootstrap/css/bootstrap-responsive.min.css'], dest: 'build/res/css/bootstrap-responsive.min.css', filter: 'isFile'} // includes files in path and its subdirs

        ]
      }
    },
    uglify: {
      options: {
        compress: true,
        banner: '/*! built for <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      dist: {
        files: {
          'build/res/js/app.min.js': ['<%= concat.app.dest %>'],
          'build/res/js/sockethub-client.min.js': ['<%= concat.sockethub.dest %>'],
          'build/res/js/remotestorage-modules.min.js': ['<%= concat.modules.dest %>']
        }
      }
    },
    cssmin: {
      minify: {
        expand: true,
        cwd: 'build/',
        src: ['*.css.tmp', '!*.min.css'],
        dest: 'build/res/css/',
        ext: '.min.css'
      }
    },

    useminPrepare: {
      html: ['build/index.html', 'build/rscallback.html']
    },
    usemin: {
      html: ['build/index.html', 'build/rscallback.html']
    },
    clean: ['build/*.tmp']
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-usemin');

  // Default task(s).
  grunt.registerTask('default', ['concat', 'copy', 'uglify', 'cssmin', 'usemin', 'clean']);

};
