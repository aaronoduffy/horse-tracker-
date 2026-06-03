/**
 * api.js
 * Wraps the RapidAPI Horse Racing API (api-sports).
 * Docs: https://rapidapi.com/api-sports/api/horse-racing
 */

const fetch = require("node-fetch");

const BASE = "https://horse-racing.p.rapidapi.com";

function headers() {
  return {
    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
    "X-RapidAPI-Host": "horse-racing.p.rapidapi.com",
  };
}

/**
 * Fetch upcoming races that a horse has been entered in.
 * Returns an array of race objects.
 */
async function getHorseEntries(horseName) {
  // Search for the horse by name first to get its ID
  const searchRes = await fetch(
    `${BASE}/horses?search=${encodeURIComponent(horseName)}`,
    { headers: headers() }
  );

  if (!searchRes.ok) {
    throw new Error(`Horse search failed: ${searchRes.status} ${await searchRes.text()}`);
  }

  const searchData = await searchRes.json();
  const horses = searchData?.response ?? searchData?.results ?? [];

  if (!horses.length) {
    console.log(`  [api] No horse found matching "${horseName}"`);
    return [];
  }

  const horseId = horses[0].id;
  console.log(`  [api] Found "${horses[0].name}" (id: ${horseId})`);

  // Get upcoming race entries for this horse
  const entriesRes = await fetch(
    `${BASE}/races?horse_id=${horseId}`,
    { headers: headers() }
  );

  if (!entriesRes.ok) {
    throw new Error(`Entries fetch failed: ${entriesRes.status}`);
  }

  const entriesData = await entriesRes.json();
  return entriesData?.response ?? entriesData?.results ?? [];
}

module.exports = { getHorseEntries };
