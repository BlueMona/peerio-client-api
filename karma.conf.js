// Karma configuration

module.exports = function (config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      'src/config.js',
      'dist/ext_lib_bundle.js',
      'dist/peerio_client_api_bundle.js',
      {pattern: 'dist/socket_worker_bundle.js', watched: true, included: false, served: true},
      {pattern: 'dist/crypto_worker_bundle.js', watched: true, included: false, served: true},
      {pattern: 'dist/dict/*.txt', watched: false, included: false, served: true},
      'spec/globals.js',
      'spec/*.js'
    ],

    // list of files to exclude
    exclude: [
      '/**/_*.js'
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {},

    // test results reporter to use
    // possible values: 'dots', 'progress', 'nyan', 'verbose'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['verbose', 'nyan'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,
    // throttling in milliseconds
    autoWatchBatchDelay: 5000,
    browserNoActivityTimeout: 120000,
    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    //browsers: ['chrome_without_security'],
    //browsers: ['Safari'],
    browsers: ['chrome_without_security', 'Safari'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,
    client: {
      useIframe: true,
      captureConsole: true
    },
    customLaunchers: {
      chrome_without_security: {
        base: 'Chrome',
        flags: ['--disable-web-security']
      }
    }
  });
};
