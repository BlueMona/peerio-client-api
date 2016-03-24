/**
 * Collection class allows storing objects in array,
 * while also indexing them by up to 2 properties.
 *
 * Collection class is developed using module pattern without cached functions, because
 * 1. It makes possible to hide private properties
 * 2. We don't create collections too often
 *
 * If Collection usage changes in a way that it will be needed to create a lot of collections in short periods of time
 * it is better to change it to 'module pattern WITH cached functions' which will greatly increase collection creation time.
 *
 * todo: consistency checks?
 */
(function (root) {
    'use strict';

    /**
     * Collection of objects available as array and as indexed by property dictionary
     * @param {string} indexPropName - property value has to be string
     * @param {string} [indexPropName2] - property value has to be string
     * @param {string} [defaultSortProp] - property name to use for sorting by default
     * @param {string} [defaultSortProp2] - property name to use for sorting is the first one isn't present
     * @param {bool} [defaultSortAsc] - set to false for desc sorting by default
     * @param {bool} [stringSort] - set to true for sorting by default sort prop using locale-aware compare
     * @return {{}}
     */
    root.Collection = function (params) {
        var indexPropName = params.indexPropName;
        var indexPropName2 = params.indexPropName2;
        var defaultSortProp = params.defaultSortProp;
        var defaultSortProp2 = params.defaultSortProp2;
        var defaultSortAsc = params.defaultSortAsc;
        var stringSort = params.stringSort;

        function clear() {
            this.arr = [];
            this.dict = {};
        }

        function add(item, dontSort) {
            if (this.dict[item[this.prop]] || (this.prop2 && this.dict[item[this.prop2]]))
                throw 'Cant Add to collection, duplicate key exists.';

            this.arr.push(item);
            this.dict[item[this.prop]] = item;
            if (this.prop2) this.dict[item[this.prop2]] = item;
            if (!dontSort) this.sort();
        }

        /**
         * Removes item from collection.
         * @param item
         * @returns {boolean} true if item was removed
         */
        function remove(item) {
            var ind = this.arr.indexOf(item);
            if (ind < 0) return false;

            this.arr.splice(ind, 1);
            delete this.dict[item[this.prop]];
            if (this.prop2) delete this.dict[item[this.prop2]];

            return true;
        }

        function removeByKey(key) {
            var item = this.dict[key];
            if (!item) return false;

            return this.remove(item);
        }

        function addOrReplace(item, dontSort) {
            var current = this.dict[item[this.prop]];
            if (!current && this.prop2 && item[this.prop2]) current = this.dict[item[this.prop2]];
            if (current) this.remove(current);
            this.add(item, dontSort);
        }

        // todo: non-string values sort

        function sortAsc(propName) {
            (stringSort ? Peerio.Util.sortStringAsc : Peerio.Util.sortAsc)(this.arr, propName || this.sortProp, this.sortProp2);
        }

        function sortDesc(propName) {
            (stringSort ? Peerio.Util.sortStringDesc : Peerio.Util.sortDesc)(this.arr, propName || this.sortProp, this.sortProp2);
        }

        function getPropValByKey(key, propName) {
            var item = this.dict[key];
            if (item) {
                return item[propName];
            }
            return null;
        }

        return {
            prop: indexPropName,
            prop2: indexPropName2,
            sortProp: defaultSortProp || indexPropName,
            sortProp2: defaultSortProp2,
            sort: defaultSortAsc === false ? sortDesc : sortAsc,
            arr: [],
            dict: {},
            clear: clear,
            add: add,
            remove: remove,
            removeByKey: removeByKey,
            addOrReplace: addOrReplace,
            sortAsc: sortAsc,
            sortDesc: sortDesc,
            getPropValByKey: getPropValByKey
        };
    };

})(this);
