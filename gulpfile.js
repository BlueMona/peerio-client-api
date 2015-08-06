var gulp = require('gulp');
var concat = require('gulp-concat');
var clean = require('gulp-clean');
var karma = require('karma').server;
var runSequence = require('run-sequence');

var outputDir = './dist/';
var dictDir = outputDir + 'dict/';

//----------------------------------------------------------------------------------------------------------------------
gulp.task('default', ['help']);
//----------------------------------------------------------------------------------------------------------------------
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
//----------------------------------------------------------------------------------------------------------------------

gulp.task('build', function (callback) {
  runSequence('build-clean',
    ['build-config', 'build-socket', 'build-dict', 'build-crypto', 'build-api', 'build-ext-lib'],
    callback);
});
//----------------------------------------------------------------------------------------------------------------------
gulp.task('build-config', function () {
  // config template for lib user's reference
  return gulp.src('src/config_template.js')
    .pipe(gulp.dest(outputDir));
});
//----------------------------------------------------------------------------------------------------------------------
gulp.task('build-socket', function () {
  // socket worker should reside in separate script,
  // we also concatenate it with dependencies
  return gulp.src(['src/network/socket_worker.js',
    'bower_components/socket.io-client/socket.io.js'])
    .pipe(concat('socket_worker_bundle.js'))
    .pipe(gulp.dest(outputDir));
});
//----------------------------------------------------------------------------------------------------------------------
gulp.task('build-dict', function () {
  // passphrase dictionaries are loaded on demand, should be separate files
  return gulp.src('src/crypto/dict/*.*')
    .pipe(gulp.dest(dictDir));
});
//----------------------------------------------------------------------------------------------------------------------
gulp.task('build-crypto', function () {
  // crypto worker bundle
  return gulp.src([
    'src/worker_shim.js',
    'src/crypto/lib/*.js',
    'bower_components/bluebird/js/browser/bluebird.js',
    'src/crypto/crypto.js',
    'src/crypto/crypto_worker.js'
  ]).pipe(concat('crypto_worker_bundle.js'))
    .pipe(gulp.dest(outputDir));
});
//----------------------------------------------------------------------------------------------------------------------
gulp.task('build-api', function () {
  // all other scripts are concatenated, excluding external libraries
  return gulp.src([
    '!src/network/socket_worker.js',
    'src/crypto/lib/nacl.js',
    'src/crypto/phrase_generator.js',
    'src/crypto/crypto_hub.js',
    'src/model/**/*',
    'src/app_logic/**/*',
    'src/network/**/*',
    'src/storage/**/*',
    'src/events/**/*',
    'src/util.js',
    'src/extensions.js',
    'src/error_reporter.js',
    'src/peerio.js'
  ]).pipe(concat('peerio_client_api_bundle.js'))
    .pipe(gulp.dest(outputDir));
});
//----------------------------------------------------------------------------------------------------------------------
gulp.task('build-ext-lib', function () {
  // external libraries bundle
  return gulp.src([
    'bower_components/lodash/lodash.js',
    'bower_components/bluebird/js/browser/bluebird.js',
    'bower_components/node-uuid/uuid.js',
    'bower_components/identicon/pnglib.js',
    'bower_components/identicon/identicon.js'
  ]).pipe(concat('ext_lib_bundle.js'))
    .pipe(gulp.dest(outputDir));
});
//----------------------------------------------------------------------------------------------------------------------
gulp.task('build-clean', function () {
  return gulp.src(outputDir, {read: false})
    .pipe(clean());
});
//----------------------------------------------------------------------------------------------------------------------
gulp.task('test', ['watch'], function () {
  karma.start({configFile: __dirname + '/karma.conf.js'});
});
//----------------------------------------------------------------------------------------------------------------------
gulp.task('watch',['build'], function(){
  gulp.watch('src/**/*', ['build']);
});