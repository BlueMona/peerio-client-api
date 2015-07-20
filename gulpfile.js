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

  // 1. config template for lib user's reference
  gulp.src('src/config_template.js')
    .pipe(gulp.dest(outputDir));

  // 2. socket worker should reside in separate script,
  // we also concatenate it with dependencies
  gulp.src(['src/network/socket_worker.js',
    'bower_components/socket.io-client/socket.io.js'])
    .pipe(concat('socket_worker_bundle.js'))
    .pipe(gulp.dest(outputDir));

  // 3. passphrase dictionaries are loaded on demand, should be separate files
  gulp.src('src/crypto/dict/*.*')
    .pipe(gulp.dest(dictDir));

  // 4. crypto worker bundle
  gulp.src([
    'src/worker_shim.js',
    'src/crypto/lib/*.js',
    'bower_components/bluebird/js/browser/bluebird.js',
    'src/crypto/crypto.js',
    'src/crypto/crypto_worker.js'
  ]).pipe(concat('crypto_worker_bundle.js'))
    .pipe(gulp.dest(outputDir));

  // 5. all other scripts are concatenated, excluding external libraries
  gulp.src([
    '!src/network/socket_worker.js',
    'src/crypto/phrase_generator.js',
    'src/crypto/crypto_hub.js',
    'src/model/**/*',
    'src/app_logic/**/*',
    'src/network/**/*',
    'src/util.js',
    'src/peerio.js'
  ]).pipe(concat('peerio_client_api_bundle.js'))
    .pipe(gulp.dest(outputDir));

  // 6. external libraries bundle
  gulp.src([
    'bower_components/lodash/lodash.js',
    'bower_components/bluebird/js/browser/bluebird.js',
    'bower_components/node-uuid/uuid.js'
  ]).pipe(concat('ext_lib_bundle.js'))
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