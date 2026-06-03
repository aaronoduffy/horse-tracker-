/**
 * store.js
 * Lightweight JSON persistence so the server remembers watched horses
 * and already-seen race IDs across restarts.
 */

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../data/store.json");

function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) return defaultStore();
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return defaultStore();
  }
}

function defaultStore() {
  return {
    horses: [],
    // { id, name, addedAt, knownRaceIds: [], lastChecked: null, notifiedRaceIds: [] }
    pushSubscriptions: [],
  };
}

function save(store) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

module.exports = { load, save };
