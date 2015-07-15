var gulp = require('gulp');
var concat = require('gulp-concat');
var clean = require('gulp-clean');
var karma = require('karma').server;

var outputDir = './dist/';
var dictDir = outputDir + 'dict/';

gulp.task('default', ['help']);

gulp.task('help', function () {
  console.log();
  console.log('+------------------------------------------------------------------------------------+');
  console.log('|                                 =====  USAGE  =====                                |');
  console.log('+------------------------------------------------------------------------------------+');
  console.log('| gulp build       - builds distribution files and copies tem to dist folder         |');
  console.log('| gulp clean       - removes everything from dist folder                             |');
  console.log('| gulp test        - starts karma server, watches for changes in src                 |');
  console.log('+------------------------------------------------------------------------------------+');
  console.log();
});

gulp.task('build', ['clean'], function () {

  // config template for lib user's reference
  gulp.src('src/config_template.js')
    .pipe(gulp.dest(outputDir));

  // socket worker should reside in separate script
  gulp.src('src/network/socket_worker.js')
    .pipe(gulp.dest(outputDir));

  // socket.io client script will be used by worker, so it has to be a separate file
  gulp.src('bower_components/socket.io-client/socket.io.js')
    .pipe(gulp.dest(outputDir));

  // passphrase dictionaries are loaded on demand, should be separate files
  gulp.src('src/crypto/dict/*.*')
    .pipe(gulp.dest(dictDir));

  // all other scripts are concatenated, including external libraries
  return gulp.src([
    '!src/config.js',
    '!src/config_template.js',
    '!src/network/socket_worker.js',
    'bower_components/lodash/lodash.js',
    'bower_components/bluebird/js/browser/bluebird.js',
    'bower_components/node-uuid/uuid.js',
    'src/**/*.js'
  ]).pipe(concat('peerio_client_api.js'))
    .pipe(gulp.dest(outputDir));

});

gulp.task('clean', function () {
  return gulp.src(outputDir, {read: false})
    .pipe(clean());
});

gulp.task('test', function () {
  gulp.watch('src/**/*', ['build']);
  karma.start({configFile: __dirname + '/karma.conf.js'});
});