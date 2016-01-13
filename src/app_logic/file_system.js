/**
 * File system interface.
 * ======================
 * It has some logic that is one level above simple create/read/write/delete file,
 * but relies on the lower level implementation of basic file system access.
 * Implement file system plugin and set Peerio.FileSystem.plugin variable to it.
 *
 */

var Peerio = this.Peerio || {};
Peerio.FileSystem = {};

Peerio.FileSystem.init = function () {
  'use strict';

  L.verbose('Peerio.FileSystem.init() start');

  var api = Peerio.FileSystem;
  delete Peerio.FileSystem.init;

  var filesDirectoryName = 'files';
  var filesDirectoryEntry; // lazy init cache

  function dummy(name) {
    var msg = name + ' not implemented.';
    L.error(msg);
    return Promise.reject(msg);
  }

  // file system access plugin to implement in clients
  api.plugin = {
    /**
     * @returns {Promise<DirectoryEntry>} - root folder
     */
    getRootDir: dummy.bind(null, 'getRootDir'),
    /**
     * @param {string} name
     * @param {DirectoryEntry} parent
     * @returns {Promise<DirectoryEntry>}
     */
    getDirectory: dummy.bind(null, 'getDirectory'),
    /**
     * @param {string} name
     * @param {DirectoryEntry} parent
     * @returns {Promise<FileEntry>}
     */
    createFile: dummy.bind(null, 'createFile'),
    /**
     * @param {Blob} blob
     * @param {FileEntry} file
     * @returns {Promise}
     */
    writeToFile: dummy.bind(null, 'writeToFile'),
    /**
     * @param {DirectoryEntry} dir
     * @returns {Promise<FileEntry[]>}
     */
    getFiles: dummy.bind(null, 'getFiles'),
    /**
     * @param {string} name
     * @param {DirectoryEntry} parent
     * @returns {Promise<FileEntry>}
     */
    getFile: dummy.bind(null, 'getFile'),
    /**
     * Returns file's properties
     * name: The name of the file. (DOMString)
     * fullPath: The full path of the file including the file name. (DOMString)
     * type: The mime type of the file. (DOMString)
     * lastModifiedDate: The last time the file was modified. (Date)
     * size: The size of the file in bytes. (long)
     * @param {FileEntry} fileEntry
     * @returns {Promise<File>}
     */
    getFileProperties: dummy.bind(null, 'getFileProperties'),
    /**
     * Opens file with OS api
     * @param {FileEntry} fileEntry
     */
    openFile: dummy.bind(null, 'openFile'),
    /**
     * @param {string} name
     * @param {DirectoryEntry} parent
     * @returns {Promise}
     */
    removeFile: dummy.bind(null, 'removeFile'),
    /**
     * @param {string} fileUrl - file/directory url in format `file://...`
     * @returns {FileEntry|DirectoryEntry} depending on url provided
     */
    getByURL: dummy.bind(null, 'getByURL'),
    /**
     * Reads and returns contents of a file
     * @param {FileEntry} fileEntry - file entry to read
     * @returns {Promise<Object<File, ArrayBuffer>>} - File object and ArrayBuffer file data
     */
    readFile: dummy.bind(null, 'readFile')
  };

  /**
   * Saves decrypted cloud file to persistent and private local cache
   * @param file - Peerio file
   * @param {Blob} blob
   */
  api.cacheCloudFile = function (file, blob) {
    L.info('Peerio.File.cacheCloudFile(...) id:{0}', file && file.id);
    return getFilesDirectory()
      .then(function (dir) {
        var name = getLocalName(file);
        L.info('Creating file {0}', name);
        return api.plugin.createFile(name, dir);
      })
      .then(function (fileEntry) {
        L.info('Saving file');
        return api.plugin.writeToFile(blob, fileEntry);
      })
      .catch(function(e){
        L.error('Error saving file. {0}', e);
        return Promise.reject();
      });
  };

  api.removeCachedFile = function (file) {
    L.info('Peerio.File.removeCachedFile() id:{0}', file && file.id);
    return getFilesDirectory()
      .then(function (dir) {
        var name = getLocalName(file);
        L.info('Removing file {0}', name);
        return api.plugin.removeFile(name, dir);
      })
      .catch(function(e){
        L.error('Failed to remove file. {0}', e);
        return Promise.reject();
      });
  };

  api.openFileWithOS = function (file) {
    L.info('Peerio.File.openFileWithOS() id:{0}', file && file.id);
    return getFilesDirectory()
      .then(function (dir) {
        L.info('Getting file entry');
        return api.plugin.getFile(getLocalName(file), dir);
      })
      .then(function (fileEntry) {
        L.info('Opening file');
        return api.plugin.openFile(fileEntry);
      })
      .catch(function(e){
        L.error('Error opening file with OS. {0}', e);
        return Promise.reject(e);
      });
  };

  /**
   * Return a list of file names within cached files directory
   * @returns {Promise<string[]>} - file names with extensions
   */
  api.getCachedFileNames = function () {
    L.info('Peerio.File.getCachedFileNames()');
    return getFilesDirectory()
      .then(function (dir) {
        return api.plugin.getFiles(dir);
      })
      .then(function (files) {
        return files.map(function (f) {
          return f.name;
        });
      })
      .catch(function(e){
        L.error('Failed to read cached file list. {0}', e);
        return Promise.reject();
      });
  };

  //-- INTERNALS -------------------------------------------------------------------------------------------------------
  function getFilesDirectory() {
    if (filesDirectoryEntry) return Promise.resolve(filesDirectoryEntry);

    return api.plugin.getRootDir()
      .then(function (root) {
        return api.plugin.getDirectory(filesDirectoryName, root);
      })
      .then(function (dir) {
        filesDirectoryEntry = dir;
        return dir;
      });
  }

  function getLocalName(file) {
    var name = file.shortID;
    var ext = Peerio.Util.getFileExtension(file.name);

    if (ext.length > 0)
      name = name + '.' + ext;
    return name;
  }

  L.verbose('Peerio.FileSystem.init() end');

};