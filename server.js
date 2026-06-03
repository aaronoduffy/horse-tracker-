/**
 * server.js
 * Small Express API so you can manage your watchlist from a browser
 * without editing JSON files by hand.
 *
 * Routes:
 *   GET  /horses              — list all tracked horses
 *   POST /horses              — add a horse  { name }
 *   DELETE /horses/:id        — remove a horse
 *   POST /subscribe           — register a web push subscription
 *   POST /poll                — trigger a manual poll immediately
 *   GET  /vapid-public-key    — returns VAPID public key for the browser
 *   GET  /                    — serves the management UI (index.html)
 */

const express = require("express");
const path = require("path");
const { load, save } = require("./store");
const { pollAll } = require("./poller");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ── Horses ───────────────────────────────────────────────────────────────────

app.get("/horses", (req, res) => {
  const store = load();
  res.json(store.horses || []);
});

app.post("/horses", (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }

  const store = load();
  const trimmed = name.trim();

  if (store.horses.some(h => h.name.toLowerCase() === trimmed.toLowerCase())) {
    return res.status(409).json({ error: "Horse already tracked" });
  }

  const horse = {
    id: Date.now(),
    name: trimmed,
    addedAt: new Date().toISOString(),
    knownRaceIds: [],
    notifiedRaceIds: [],
    lastChecked: null,
  };

  store.horses.push(horse);
  save(store);

  console.log(`[api] Added horse: ${trimmed}`);
  res.status(201).json(horse);
});

app.delete("/horses/:id", (req, res) => {
  const store = load();
  const id = Number(req.params.id);
  const before = store.horses.length;
  store.horses = store.horses.filter(h => h.id !== id);

  if (store.horses.length === before) {
    return res.status(404).json({ error: "Horse not found" });
  }

  save(store);
  console.log(`[api] Removed horse id: ${id}`);
  res.json({ ok: true });
});

// ── Web Push ─────────────────────────────────────────────────────────────────

app.get("/vapid-public-key", (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: "VAPID not configured" });
  res.json({ key });
});

app.post("/subscribe", (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) {
    return res.status(400).json({ error: "Invalid subscription object" });
  }

  const store = load();
  store.pushSubscriptions = store.pushSubscriptions || [];

  // Avoid duplicates
  const exists = store.pushSubscriptions.some(s => s.endpoint === sub.endpoint);
  if (!exists) {
    store.pushSubscriptions.push(sub);
    save(store);
    console.log(`[api] New push subscriber registered`);
  }

  res.status(201).json({ ok: true });
});

// ── Manual poll trigger ───────────────────────────────────────────────────────

app.post("/poll", async (req, res) => {
  res.json({ ok: true, message: "Poll started" });
  console.log("[api] Manual poll triggered");
  try {
    await pollAll();
  } catch (e) {
    console.error("[api] Poll error:", e.message);
  }
});

module.exports = app;
