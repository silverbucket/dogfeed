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
              'res/js/feeds/feeds.js',
              'res/js/directives/misc.js',
              'vendor/angular-shared/ngRemoteStorage.js',
              'vendor/angular-shared/ngCommandQueue.js',
              'vendor/angular-shared/ngMessages.js',
              'vendor/sockethub-client/angular/ngSockethubClient.js',
              'vendor/sockethub-client/angular/ngSockethubRemoteStorage.js',
              'vendor/bootstramp/js/bootstrap-switch.min.js'],
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
          {expand: true, src: ['res/js/feeds/*.html.tpl'], dest: 'build/', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: true, src: ['res/views/*.html'], dest: 'build/', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/bootstrap/fonts/glyphicons-halflings-regular.eot'], dest: 'build/vendor/bootstrap/fonts/glyphicons-halflings-regular.eot', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/bootstrap/fonts/glyphicons-halflings-regular.svg'], dest: 'build/vendor/bootstrap/fonts/glyphicons-halflings-regular.svg', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/bootstrap/fonts/glyphicons-halflings-regular.ttf'], dest: 'build/vendor/bootstrap/fonts/glyphicons-halflings-regular.ttf', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/bootstrap/fonts/glyphicons-halflings-regular.woff'], dest: 'build/vendor/bootstrap/fonts/glyphicons-halflings-regular.woff', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/jquery.min.js'], dest: 'build/vendor/jquery.min.js', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/angular.min.js'], dest: 'build/vendor/angular.min.js', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/angular-route.min.js'], dest: 'build/vendor/angular-route.min.js', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/angular-sanitize.min.js'], dest: 'build/vendor/angular-sanitize.min.js', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/snap.min.js'], dest: 'build/vendor/snap.min.js', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/matchMedia.js'], dest: 'build/vendor/matchMedia.js', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/remotestorage/remotestorage.min.js'], dest: 'build/vendor/remotestorage.min.js', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/bootstrap/js/bootstrap.min.js'], dest: 'build/vendor/bootstrap/js/bootstrap.min.js', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['vendor/bootstrap/css/bootstrap.min.css'], dest: 'build/vendor/bootstrap/css/bootstrap.min.css', filter: 'isFile'}, // includes files in path and its subdirs
          {expand: false, src: ['<%= concat.app.dest %>'], dest: 'build/res/js/app.min.js', filter: 'isFile'} // includes files in path and its subdirs

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
          //'build/res/js/app.min.js': ['<%= concat.app.dest %>'],
          'build/vendor/sockethub-client.min.js': ['<%= concat.sockethub.dest %>'],
          'build/vendor/remotestorage-modules.min.js': ['<%= concat.modules.dest %>']
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

  //grunt.file.write('build/VERSION', grunt.pkg.version);

  // Default task(s).
  grunt.registerTask('default', ['concat', 'copy', 'uglify', 'cssmin', 'usemin', 'clean']);
};
