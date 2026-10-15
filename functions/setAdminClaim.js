// Node script to set custom claim `admin: true` for a user via Admin SDK
// Usage: node setAdminClaim.js <SERVICE_ACCOUNT_KEY_JSON> <UID>

const admin = require('firebase-admin');
const fs = require('fs');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node setAdminClaim.js <serviceAccountKey.json> <uid>');
    process.exit(1);
  }
  const [serviceAccountPath, uid] = args;
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`Set admin:true for uid=${uid}`);
    process.exit(0);
  } catch (err) {
    console.error('Error setting custom claim:', err);
    process.exit(2);
  }
}

main();
