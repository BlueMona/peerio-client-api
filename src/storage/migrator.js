/**
 * Handles database migrations
 */


var Peerio = this.Peerio || {};


(function () {
    'use strict';

    Peerio.SqlMigrator = {
        getCurrentVersion: getCurrentVersion,
        migrateUp: migrateUp,
        migrateDown: migrateDown
    };

    function migrateUp(db, targetVer) {
        var maxVersion = Peerio.SqlMigrations.length - 1;
        // omitted target version counts as whatever maximum version we have
        if (targetVer == null) targetVer = maxVersion;

        return validate(targetVer)
            .then(() => getCurrentVersion(db))
            .then(currentVersion => {
                if (currentVersion === targetVer)
                    return Promise.resolve();

                if (currentVersion > targetVer)
                    return Promise.reject('Cant migrate up from version ' + currentVersion + ' to ' + targetVer);

                return applyMigrations(db, 'up', currentVersion + 1, targetVer)
                    .then(()=> L.info('Migrations applied successfully'))
                    .catch(err => {
                        L.error('Failed to apply migrations. {0}', err);
                        return Promise.reject('Migration failed.');
                    });
            })
    }

    function migrateDown(db, targetVer) {
        // omitted target version counts as clean database
        if (targetVer == null) targetVer = -1;

        return validate(targetVer)
            .then(() => getCurrentVersion(db))
            .then(currentVersion => {
                if (currentVersion === targetVer)
                    return promise.resolve();

                if (currentVersion < targetVer)
                    return Promise.reject('Cant migrate down from version ' + currentVersion + ' to ' + targetVer);

                return applyMigrations(db, 'down', currentVersion, targetVer + 1)
                    .then(()=> L.info('Migrations applied successfully'))
                    .catch(err => {
                        L.error('Failed to apply migrations. {0}', err);
                        return Promise.reject('Migration failed.');
                    });
            })
    }

    // todo: the whole up/down edges -1/+1 looks ugly and confusing
    function applyMigrations(db, direction, start, stop) {
        if (direction !== 'up' && direction !== 'down') return Promise.reject('Wrong migration direction ' + direction);
        L.info('Migrating {0} from {1} to {2}. Maximum migration version is {3}',
            direction, direction === 'up' ? start - 1 : start, direction === 'up' ? stop : stop - 1, Peerio.SqlMigrations.length - 1);

        var queue = Peerio.SqlMigrations.slice(start, stop + 1);
        if (direction === 'down') queue.reverse();

        return Promise.each(queue, migration => {
                L.info('Executing migration {0}', migration.version);
                return db.transaction(tx => {
                        migration[direction](tx);
                        writeVersionInfo(tx, migration.version);
                    })
                    .then(() => L.info('Migration {0} applied successfully', migration.version))
                    .catch((err) => {
                        L.error('Failed to apply migration {0}. {1}', migration.version, err);
                        return Promise.reject();
                    });
            }
        );
    }

    function validate(targetVer) {
        // just checking if all migrations are fine
        var m = Peerio.SqlMigrations;
        for (var i = 0; i < m.length; i++) {
            if (m[i].version !== i)
                return Promise.reject('Migration version mismatching with migrations array index found.');
        }

        var migrations = Peerio.SqlMigrations;
        // if it was specified, check if it exists
        if (targetVer >= 0 && !migrations[targetVer])
            return Promise.reject('Target migration version ' + targetVer + ' not found.');

        return Promise.resolve();
    }

    function writeVersionInfo(tx, version) {
        L.info('Writing new db version: {0}', version);
        // in case of downgrading
        tx.executeSql('DELETE FROM versions WHERE ver>=?', [version]);
        if (version >= 0) tx.executeSql('INSERT INTO versions VALUES(?, ?)', [version, Date.now()]);
    }

    function getCurrentVersion(db) {
        db.executeSql('CREATE TABLE IF NOT EXISTS versions (ver INTEGER, ts INTEGER)');
        return db.executeSql('SELECT MAX(ver) as ver FROM versions')
            .then(res=> {
                var ver = res.rows.item(0).ver;
                return ver == null ? -1 : ver;
            });
    }
})();