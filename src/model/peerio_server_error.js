/**
 * Custom js Error object.
 * Network layer creates this object on server errors.
 */

function PeerioServerError(code) {
  this.code = +code;
  this.message = this.getMessage(code);
  this.timestamp = Date.now();
  this.isOperational = true;
}

PeerioServerError.prototype = Object.create(Error.prototype);

PeerioServerError.prototype.getMessage = function (code) {
  return this.errorCodes[code] || 'Server error.';
};

PeerioServerError.prototype.errorCodes = {
  404: 'Resource does not exist or you are not allowed to access it.',
  413: 'Storage quota exceeded.',
  406: 'Malformed request.',
  423: 'Authentication error.',
  424: 'Two-factor authentication required.',
  425: 'The account has been throttled (sent too many requests that failed to authenticate).',
  426: 'User blacklisted.'
};