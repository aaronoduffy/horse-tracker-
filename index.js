/**
 * index.js — entry point
 * Starts the Express API server and schedules the polling cron job.
 */

require("dotenv").config();
const cron = require("node-cron");
const app = require("./server");
const { pollAll } = require("./poller");

const PORT = process.env.PORT || 3000;
const CRON = process.env.CRON_SCHEDULE || "0 */3 * * *"; // every 3 hours

// ── Start HTTP server ─────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║       🏇  Horse Entry Tracker            ║
║       Server running on port ${PORT}        ║
╚══════════════════════════════════════════╝

  Manage your watchlist at: http://localhost:${PORT}
  Poll schedule:            ${CRON}
  `);
});

// ── Schedule polling ──────────────────────────────────────────────────────────

if (!cron.validate(CRON)) {
  console.error(`[cron] Invalid CRON_SCHEDULE: "${CRON}" — falling back to every 3 hours`);
}

cron.schedule(CRON, async () => {
  console.log(`\n[cron] Scheduled poll triggered at ${new Date().toLocaleTimeString()}`);
  try {
    await pollAll();
  } catch (e) {
    console.error("[cron] Poll failed:", e.message);
  }
});

// ── Run once on startup so you don't wait up to 3h for the first check ────────

console.log("[startup] Running initial poll…\n");
pollAll().catch(e => console.error("[startup] Initial poll error:", e.message));
