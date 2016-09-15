/**
 * Various Peerio utility functions
 */

var Peerio = this.Peerio || {};
Peerio.Util = {};

Peerio.Util.init = function () {
    'use strict';

    var api = Peerio.Util = {};

    /**
     *  malicious server safe hasOwnProperty function
     *  @param {object} object to test for property existence, can be null or undefined
     *  @param {string} property name
     */
    api.hasProp = Function.call.bind(Object.prototype.hasOwnProperty);

    var emailExp = new RegExp('^([-0-9a-zA-Z.+_]+@[-0-9a-zA-Z.+_]+\\.[a-zA-Z]{2,20})$');
    var phoneExp = new RegExp('^\\+?(\\d|\\s|\\-|\\(|\\)){6,20}$');

    /**
     * Parses an address and returns its type and parsed format.
     * In the case of phone numbers, the number is stripped from any non-digits.
     * @param {string} address - Address to parse.
     * @return {object} {type:'email||phone', address:'parsed address'}
     */
    api.parseAddress = function (address) {
        if (emailExp.test(address)) {
            return {
                type: 'email',
                value: address.match(emailExp)[0]
            };
        }

        if (phoneExp.test(address)) {
            return {
                type: 'phone',
                value: address.replace(/\D+/g, '')
            };
        }

        return false;
    };

    /**
     * Parses an array of contacts from iOS/android. Removes any invalid addresses
     * parses valid addresses and returns an array of contact objects.
     * @param [array] device contacts [{name:[],emails:[], phones:[]}]
     * @return [array] [{name:String,emails:[], phones:[], id:String}]
     */
    api.filterDeviceContacts = function (deviceContacts) {

        var parsedContacts = [];

        var validatePhone = function (phone) {
            var parsedPhone = Peerio.Util.parseAddress(phone.value);
            if (parsedPhone) {
                phone.display = phone.value;
                phone.value = parsedPhone.value;
            }
            return parsedPhone;
        };

        var validateEmail = function (email) {
            return Peerio.Util.parseAddress(email.value);
        };

        deviceContacts.forEach(function (contact) {
            if(!contact.name) L.error(contact);
            parsedContacts.push({
                id: 'contact-' + contact.id,
                emails: _.filter(contact.emails, validateEmail),
                name: contact.name && contact.name.formatted,
                phones: _.filter(contact.phoneNumbers, validatePhone)
            });
        });

        return parsedContacts;

    };

    /**
     * Parses an array of iOS/android contacts for Peerio.Net.AddressLookup
     * Address objects require and ID property for lookup.
     * @param [array] device contacts [{emails:[], phones:[], id:String}]
     * @return [array] [{id:String, email:String}, {id:String, phone:String}]
     */
    api.parseAddressesForLookup = function (deviceContacts) {

        var addressLookups = [];

        var processAddress = function (address, contactID) {
            var parsed = api.parseAddress(address.value);
            if (parsed) {
                var parsedObj = {id: contactID};
                parsedObj[parsed.type] = parsed.value;
                addressLookups.push(parsedObj);
            }
        };

        _.forOwn(deviceContacts, function (contact) {
            _.each(contact.emails, function (email) {
                processAddress(email, contact.id);
            });

            _.each(contact.phones, function (phone) {
                processAddress(phone, contact.id);
            });
        });

        return addressLookups;
    };

    /**
     *  1. detects if message from worker contains 'ljsMessage' property
     *  2. if it does - calls L.rawWrite(message)
     *  @param {string} data - object passed by worker
     *  @returns {boolean} true if it was a log message
     */
    api.processWorkerLog = function (data) {
        if (!data.hasOwnProperty('ljsMessage')) return false;
        L.rawWrite(data.ljsMessage, data.level);
        return true;
    };

    /**
     * get string hash from string
     * @param {string} text
     * @returns {string} hash in HEX format
     */
    api.sha256 = function (text) {
        var hash = new jsSHA('SHA-256', 'TEXT');
        hash.update(text);
        return hash.getHash('HEX');
    };

    api.sortAsc = function (arr, prop) {
        return arr.sort(function (a, b) {
            if (a[prop] > b[prop]) return 1;
            if (a[prop] < b[prop]) return -1;
            return 0;
        });
    };
    api.sortDesc = function (arr, prop) {
        return arr.sort(function (a, b) {
            if (a[prop] > b[prop]) return -1;
            if (a[prop] < b[prop]) return 1;
            return 0;
        });
    };
    var collator = window.Intl && Intl.Collator && new Intl.Collator(undefined, {sensitivity: 'base'}) || null;
    var ascCompare, descCompare;
    if (collator) {
        ascCompare = function (a, b) {
            return collator.compare(a, b);
        };
        descCompare = function (a, b) {
            return collator.compare(b, a);
        };
    } else {
        ascCompare = function (a, b) {
            return a.localeCompare(b, undefined, {sensitivity: 'base'});
        };
        descCompare = function (a, b) {
            return b.localeCompare(a, undefined, {sensitivity: 'base'});
        };
    }
    api.sortStringAsc = function (arr, prop) {
        return arr.sort(function (a, b) {
            return ascCompare(a[prop], b[prop]);
        });
    };
    api.sortStringDesc = function (arr, prop) {
        return arr.sort(function (a, b) {
            return descCompare(a[prop], b[prop]);
        });
    };

    /**
     * Extracts extension from file name
     * @param fileName
     * @returns {string} dot-less extension
     */
    api.getFileExtension = function (fileName) {
        var extension = fileName.toLowerCase().match(/\.\w+$/);
        extension = extension ? extension[0].substring(1) : '';
        return extension;
    };

    /**
     * Removes extension (including dot) from file name
     * @param fileName
     * @returns {string}
     */
    api.getFileName = function (fileName) {
        var dotInd = fileName.lastIndexOf('.');
        if (dotInd >= 0)fileName = fileName.substring(0, dotInd);
        var slashInd = fileName.lastIndexOf('/');
        var bslashInd = fileName.lastIndexOf('\\');
        slashInd = Math.max(slashInd, bslashInd);
        if (slashInd >= 0) fileName = fileName.substring(slashInd + 1);
        return fileName;
    };

    api.getFileNameAndExtension = function (path) {
        return api.getFileName(path) + '.' + api.getFileExtension(path);
    };

    api.toInt8Array = function(val) {
        return new Uint8Array(Object.keys(val).map( (key) => val[key] ));
    };

    api.simpleSemverCompare = function(a,b){
        if(!is.string(a) || !is.string(b)) return false;
        a = a.split('.').map(i => +i);
        b = b.split('.').map(i => +i);
        if(a.length!==3 || b.length !==3) return false;
        for(var i=0;i<3;i++){
            if(a[i]===b[i]) continue;
            // a < b
            if(a[i]<b[i]) return -1;
            // a > b
            return 1;
        }

        // a == b
        return 0;
    };

    /**
    *  Interpolates string replacing placeholders with arguments
    *  @param {string} str - template string with placeholders in format {0} {1} {2}
    *  where number is argument array index.
    *  Numbers also can be replaced with property names or argument object.
    *  @param {Array | Object} args - argument array or object
    *  @returns {string} interpolated string
    */
    api.interpolate = function (str, args) {
        if (!args || !args.length) return str;

        return str.replace(
            /{([^{}]*)}/g,
            (a, b) => {
                return api.stringify(args[b]);
            }
        );
    };

	// Opinionated any-value to string converter
	api.stringify = function (val) {
		if (typeof(val) === 'string') return val;

		if (val instanceof Error)
			return val.message + ' ' + val.stack;

		if (val instanceof Date)
			return val.toISOString();

		return JSON.stringify(val);
	};

    // this is not ideal and won't work in all cases, but does the job for what it was originally created
    api.tryCatchAllFunctions = function(obj){
        for(var prop in obj){
            var fn = obj[prop];
            if(is.function(fn)){
                (function(f, o, p){
                    o[p] = (function(){
                        try {
                            return f.apply(o, arguments);
                        } catch(ex) {
                            L.error(ex);
                            return Promise.resolve(false);
                        }
                    });
                })(fn, obj, prop);
            }
        }
    };

    api.filterFirst = function(arr, pred, max) { 
        var r = []; 
        for(i = 0; i < arr.length; ++i) { 
            if(r.length >= max) break; 
            if(pred(arr[i], i)) r.push(arr[i]); 
        }
        return r; 
    };

    api.pinEntropyCheck = function (pin) {
        if (pin.match(/0{6}|1{6}|2{6}|3{6}|4{6}|5{6}|6{6}|7{6}|8{6}|9{6}/)
            || pin.match(/012345|123456|234567|345678|456789|543210|654321|765432|876543|98765/)) return false;
        return true;
    };
};
