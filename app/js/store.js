var store = {
  db: null,

  init: function () {
    if (store.db) { return Promise.resolve(store.db) }
    return idb.open('mws-db', 1, function (upgradeDb) {
      upgradeDb.createObjectStore('outbox', { autoIncrement: true })
    }).then(function (db) {
      return store.db = db
    })
  },

  outbox: function (mode) {
    return store.init().then(function (db) {
      return db.transaction('outbox', mode).objectStore('outbox')
    })
  }
}
