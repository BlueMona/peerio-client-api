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
            parsedContacts.push({
                id: "contact-" + contact.id,
                emails: _.filter(contact.emails, validateEmail),
                name: contact.name.formatted,
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

        var processAddress = function (address, contactId) {
            var parsed = api.parseAddress(address.value);
            if (parsed) {
                var parsedObj = {id: contactId};
                parsedObj[parsed.type] = parsed.value;
                addressLookups.push(parsedObj);
            }
        };

        _.forOwn(deviceContacts, function (contact) {
            _.each(contact.emails, function (email) {
                processAddress(email, contact.id)
            });

            _.each(contact.phones, function (phone) {
                processAddress(phone, contact.id)
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
            return collator.compare(a[prop], b[prop]);
        };
        descCompare = function (a, b) {
            return collator.compare(b[prop], a[prop])
        };
    } else {
        ascCompare = function (a, b) {
            a.localeCompare(b, undefined, {sensitivity: 'base'});
        };
        descCompare = function (a, b) {
            b.localeCompare(a, undefined, {sensitivity: 'base'});
        };
    }
    api.sortStringAsc = function (arr, prop) {
        return arr.sort(ascCompare);
    };
    api.sortStringDesc = function (arr, prop) {
        return arr.sort(descCompare);
    };

    /**
     * Extracts extension from file name
     * @param fileName
     * @returns {string} dot-less extension
     */
    api.getFileExtension = function (fileName) {
        var dotInd = fileName.lastIndexOf('.');
        return dotInd >= 0 ? fileName.substring(dotInd + 1) : '';
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
        var bslashInd = fileName.lastIndexOf("\\");
        slashInd = Math.max(slashInd, bslashInd);
        if (slashInd >= 0) fileName = fileName.substring(slashInd + 1);
        return fileName;
    };

    api.getFileNameAndExtension = function (path) {
        return api.getFileName(path) + '.' + api.getFileExtension(path);
    };
};