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
      dogfeed: {
        // the files to concatenate
        src: ['res/js/dogfeed.js', 'res/js/ngRSS.js'],
        // the location of the resulting JS file
        dest: 'build/<%= pkg.name %>.js.tmp'
      },
      dogfeedCSS: {
        // the files to concatenate
        src: ['res/**/*.css'],
        // the location of the resulting JS file
        dest: 'build/dogfeed.css.tmp'
      },
      flatuiCSS: {
        // the files to concatenate
        src: ['vendor/flat-ui/*.css'],
        // the location of the resulting JS file
        dest: 'build/flat-ui.css.tmp'
      },
      remotestorageModules: {
        // the files to concatenate
        src: ['vendor/remotestorage/*-*.js'],
        // the location of the resulting JS file
        dest: 'build/remotestorage-modules.js.tmp'
      },
      remotestorageAngular: {
        // the files to concatenate
        src: ['res/js/ngRemoteStorage.js'],
        // the location of the resulting JS file
        dest: 'build/remotestorage-angular.js.tmp'
      },
      sockethubClient: {
        // the files to concatenate
        src: ['vendor/sockethub-client/sockethub-client.js'],
        // the location of the resulting JS file
        dest: 'build/sockethub-client.js.tmp'
      },
      sockethubAngular: {
        // the files to concatenate
        src: ['vendor/sockethub-client/angular/ngSockethubClient.js'],
        // the location of the resulting JS file
        dest: 'build/sockethub-angular.js.tmp'
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
          'build/res/js/dogfeed.min.js': ['<%= concat.dogfeed.dest %>'],
          'build/res/js/remotestorage-modules.min.js': ['<%= concat.remotestorageModules.dest %>'],
          'build/res/js/remotestorage-angular.min.js': ['<%= concat.remotestorageAngular.dest %>'],
          'build/res/js/sockethub-client.min.js': ['<%= concat.sockethubClient.dest %>'],
          'build/res/js/sockethub-angular.min.js': ['<%= concat.sockethubAngular.dest %>']
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
      html: ['build/index.html']
    },
    usemin: {
      html: ['build/index.html']
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
