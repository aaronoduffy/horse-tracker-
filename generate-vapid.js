/**
 * generate-vapid.js
 * Run ONCE to generate VAPID keys for web push.
 * Copy the output into your .env file.
 *
 * Usage: node src/generate-vapid.js
 */

const webpush = require("web-push");
const keys = webpush.generateVAPIDKeys();

console.log(`
Copy these into your .env file:

VAPID_PUBLIC_KEY=${keys.publicKey}
VAPID_PRIVATE_KEY=${keys.privateKey}
`);
