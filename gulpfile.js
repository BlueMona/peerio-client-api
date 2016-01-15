var gulp = require('gulp');
var concat = require('gulp-concat');
var clean = require('gulp-clean');
var karma = require('karma').server;
var runSequence = require('run-sequence');
var babel = require('gulp-babel');

var outputDir = './dist/';
var dictDir = outputDir + 'dict/';

var babelOptions = {
    compact: false,
    presets: [],
    plugins: [
        "syntax-function-bind",
        "transform-function-bind",
        "transform-object-assign",
        "transform-es2015-arrow-functions",
        "transform-es2015-block-scoped-functions",
        "transform-es2015-block-scoping",
        "transform-es2015-destructuring",
        "transform-es2015-for-of",
        "transform-es2015-function-name",
        "transform-es2015-shorthand-properties",
        "transform-es2015-spread"
    ],
    ignore: 'bower_components/**/*',
    ast: false
};
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
        .pipe(babel(babelOptions))
        .pipe(gulp.dest(outputDir));
});
//----------------------------------------------------------------------------------------------------------------------
gulp.task('build-socket', function () {
    // socket worker should reside in separate script,
    // we also concatenate it with dependencies
    return gulp.src([
        'src/worker_shim.js',
        'bower_components/L.js/L.js',
        'bower_components/socket.io-client/socket.io.js',
        'src/network/socket_worker.js'
    ]).pipe(babel(babelOptions))
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
        'bower_components/L.js/L.js',
        'src/crypto/base58.js',
        'src/crypto/base64shim.js',
        'bower_components/blake2s-js/blake2s.js',
        'bower_components/scrypt-async/scrypt-async.js',
        'bower_components/tweetnacl/nacl-fast.js',
        'bower_components/nacl-stream/nacl-stream.js',
        'bower_components/bluebird/js/browser/bluebird.js',
        'src/crypto/crypto.js',
        'src/crypto/crypto_worker.js'
    ]).pipe(babel(babelOptions))
        .pipe(concat('crypto_worker_bundle.js'))
        .pipe(gulp.dest(outputDir));
});
//----------------------------------------------------------------------------------------------------------------------
gulp.task('build-api', function () {
    // all other scripts are concatenated, excluding external libraries
    return gulp.src([
        '!src/network/socket_worker.js',
        'src/collection.js',
        'src/queue.js',
        'src/crypto/base64shim.js',
        'bower_components/tweetnacl/nacl-fast.js', // todo: can we move it to ext lib?
        'src/crypto/phrase_generator.js',
        'src/crypto/crypto_hub.js',
        'src/model/**/*',
        'src/app_logic/**/*',
        'src/network/**/*',
        'src/storage/**/*',
        'src/events/**/*',
        'src/util.js',
        'src/extensions.js',
        'src/peerio.js'
    ]).pipe(babel(babelOptions))
        .pipe(concat('peerio_client_api_bundle.js'))
        .pipe(gulp.dest(outputDir));
});
//----------------------------------------------------------------------------------------------------------------------
gulp.task('build-ext-lib', function () {
    // external libraries bundle
    return gulp.src([
        'bower_components/L.js/L.js',
        'src/crypto/base58.js',
        'bower_components/lodash/lodash.js',
        'src/linkify.min.js',
        'bower_components/moment/min/moment-with-locales.min.js',
        'bower_components/bluebird/js/browser/bluebird.js',
        'bower_components/node-uuid/uuid.js',
        'bower_components/jssha/src/sha256.js',
        'bower_components/identicon/pnglib.js',
        'bower_components/identicon/identicon.js',
        'bower_components/identicon/is_js/is.js'
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
gulp.task('watch', ['build'], function () {
    gulp.watch(['src/**/*', 'bower_components/L.js/L.js'], ['build']);
});