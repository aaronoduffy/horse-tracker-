/**
 * notify.js
 * Handles email (SMTP via nodemailer) and web push notifications.
 */

const nodemailer = require("nodemailer");
const webpush = require("web-push");
const { load } = require("./store");

// ── VAPID setup ──────────────────────────────────────────────────────────────

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ── Email ────────────────────────────────────────────────────────────────────

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail(horseName, race) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("  [email] SMTP not configured — skipping");
    return;
  }

  const raceName = race.name || race.race_name || "Unknown Race";
  const venue = race.course || race.venue || "Unknown Venue";
  const raceDate = formatDate(race.date || race.race_date || race.datetime);
  const daysAway = daysUntil(race.date || race.race_date || race.datetime);

  const transport = createTransport();

  await transport.sendMail({
    from: `"The Form Book 🏇" <${process.env.SMTP_USER}>`,
    to: process.env.ALERT_EMAIL,
    subject: `🏇 Early entry: ${horseName} — ${raceName}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; color: #0f0e0c;">
        <div style="border-top: 4px solid #0f0e0c; padding-top: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 28px; margin: 0; letter-spacing: -0.5px;">The Form Book</h1>
          <p style="font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #6b6456; margin: 4px 0 0;">Early Entry Alert</p>
        </div>

        <p style="font-size: 15px; margin-bottom: 20px;">
          <strong>${horseName}</strong> has been entered in a race <strong>${daysAway} day${daysAway !== 1 ? "s" : ""} from now</strong> — well ahead of the night-before deadline.
        </p>

        <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:24px;">
          <tr style="border-bottom: 1px solid #c9bfae;">
            <td style="padding: 10px 0; color: #6b6456; width: 120px;">Race</td>
            <td style="padding: 10px 0;"><strong>${raceName}</strong></td>
          </tr>
          <tr style="border-bottom: 1px solid #c9bfae;">
            <td style="padding: 10px 0; color: #6b6456;">Venue</td>
            <td style="padding: 10px 0;">${venue}</td>
          </tr>
          <tr style="border-bottom: 1px solid #c9bfae;">
            <td style="padding: 10px 0; color: #6b6456;">Date</td>
            <td style="padding: 10px 0;">${raceDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b6456;">Horse</td>
            <td style="padding: 10px 0;">${horseName}</td>
          </tr>
        </table>

        <p style="font-size: 12px; color: #6b6456; border-top: 1px solid #c9bfae; padding-top: 12px;">
          Sent by your Horse Entry Tracker. This entry was detected more than 1 day before the race — no night-before or day-of noise.
        </p>
      </div>
    `,
  });

  console.log(`  [email] ✓ Sent alert for ${horseName} → ${raceName}`);
}

// ── Web Push ─────────────────────────────────────────────────────────────────

async function sendPushToAll(horseName, race) {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.log("  [push] VAPID not configured — skipping");
    return;
  }

  const store = load();
  const subs = store.pushSubscriptions || [];

  if (!subs.length) {
    console.log("  [push] No push subscribers registered");
    return;
  }

  const raceName = race.name || race.race_name || "Unknown Race";
  const venue = race.course || race.venue || "Unknown Venue";
  const raceDate = formatDate(race.date || race.race_date || race.datetime);

  const payload = JSON.stringify({
    title: `🏇 ${horseName} entered!`,
    body: `${raceName} at ${venue} — ${raceDate}`,
    icon: "/icon.png",
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (e) {
      console.log(`  [push] Failed to push to a subscriber: ${e.message}`);
    }
  }

  console.log(`  [push] ✓ Sent to ${sent}/${subs.length} subscriber(s)`);
}

// ── Utils ────────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "Unknown date";
  return new Date(dateStr).toLocaleDateString("en-IE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function daysUntil(dateStr) {
  if (!dateStr) return "?";
  const race = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((race - today) / (1000 * 60 * 60 * 24));
}

module.exports = { sendEmail, sendPushToAll };
