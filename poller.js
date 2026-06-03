/**
 * poller.js
 * Core logic: check all tracked horses, detect new early entries,
 * fire notifications, update the store.
 */

const { load, save } = require("./store");
const { getHorseEntries } = require("./api");
const { sendEmail, sendPushToAll } = require("./notify");

/**
 * Returns true if the race is more than 1 full day away.
 * This filters OUT night-before and day-of entries.
 */
function isEarlyEntry(dateStr) {
  if (!dateStr) return false;
  const raceDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = (raceDate - today) / (1000 * 60 * 60 * 24);
  return diffDays > 1;
}

function raceId(race) {
  // Build a stable ID from whatever the API gives us
  return (
    race.id ||
    race.race_id ||
    `${(race.date || race.race_date || race.datetime || "").slice(0, 10)}_${race.course || race.venue || ""}_${race.name || race.race_name || ""}`.replace(/\s+/g, "_")
  );
}

async function pollAll() {
  const store = load();
  const horses = store.horses || [];

  if (!horses.length) {
    console.log("[poll] No horses tracked — nothing to do");
    return;
  }

  console.log(`[poll] Checking ${horses.length} horse(s)…`);

  for (let i = 0; i < horses.length; i++) {
    const horse = horses[i];
    console.log(`[poll] → ${horse.name}`);

    let entries;
    try {
      entries = await getHorseEntries(horse.name);
    } catch (e) {
      console.error(`  [poll] Error fetching entries for ${horse.name}: ${e.message}`);
      continue;
    }

    // Filter to early entries only (more than 1 day away)
    const earlyEntries = entries.filter(r => {
      const dateStr = r.date || r.race_date || r.datetime;
      return isEarlyEntry(dateStr);
    });

    const knownIds = new Set(horse.knownRaceIds || []);
    const notifiedIds = new Set(horse.notifiedRaceIds || []);

    // New early entries we haven't seen before
    const brandNew = earlyEntries.filter(r => {
      const id = raceId(r);
      return !knownIds.has(id) && !notifiedIds.has(id);
    });

    if (brandNew.length > 0) {
      console.log(`  [poll] 🏇 ${brandNew.length} new early entry/entries for ${horse.name}!`);

      for (const race of brandNew) {
        try {
          await sendEmail(horse.name, race);
        } catch (e) {
          console.error(`  [poll] Email error: ${e.message}`);
        }
        try {
          await sendPushToAll(horse.name, race);
        } catch (e) {
          console.error(`  [poll] Push error: ${e.message}`);
        }

        notifiedIds.add(raceId(race));
      }
    } else {
      console.log(`  [poll] No new early entries for ${horse.name}`);
    }

    // Update known IDs (all early entries now visible)
    const allEarlyIds = earlyEntries.map(raceId);

    horses[i] = {
      ...horse,
      knownRaceIds: allEarlyIds,
      notifiedRaceIds: Array.from(notifiedIds),
      lastChecked: new Date().toISOString(),
    };
  }

  store.horses = horses;
  save(store);
  console.log(`[poll] Done. Next run in ~3 hours.\n`);
}

module.exports = { pollAll };
