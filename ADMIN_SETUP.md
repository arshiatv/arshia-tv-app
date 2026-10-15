# Admin Setup & Security (Quick + Recommended)

This file contains step-by-step instructions and prepared rule files and Cloud Functions to make sure only *you* can manage content, ads, and the force-update settings.

Files added to the repo:
- firebase/rules/realtime.rules.json  (Realtime Database rules using /admins list)
- firebase/rules/storage.rules       (Storage rules using custom claim `admin:true`)
- functions/getStreamToken/index.js  (Callable Cloud Function example for signed stream URLs)
- functions/setAdminClaim.js         (Node script to set custom claim `admin:true` for a UID)
- functions/package.json             (functions deps)

Quick path (fast, minimal changes)
1. Add your UID to Realtime Database:
   - Go to Firebase Console → Authentication → Users → Find your user and copy the UID.
   - Realtime Database → Data → create node `/admins/<YOUR_UID>` = true

2. Deploy Realtime Database rules (quick):
   - In Firebase Console → Realtime Database → Rules → paste contents of `firebase/rules/realtime.rules.json` and publish.

3. Storage rules (quick):
   - If you prefer the simple quick path (without custom claims), modify `firebase/rules/storage.rules` where write checks `request.auth.uid == "YOUR_UID"`.
   - Paste into Firebase Console → Storage → Rules and publish.

Recommended (secure) path
1. Use custom claims for admin role (recommended):
   - Obtain a service account JSON for your Firebase project.
   - Run: `node functions/setAdminClaim.js ./serviceAccountKey.json <YOUR_UID>`
   - This sets `admin:true` in the user's token.

2. Update Storage rules to require `request.auth.token.admin == true` (already set in `firebase/rules/storage.rules`).

3. Deploy Cloud Function `getStreamToken`:
   - cd functions
   - npm install
   - firebase deploy --only functions:getStreamToken

4. Update your client player to request a signed URL via Callable Function:
   - Use firebase functions client SDK to call `getStreamToken({ streamRef })` and use the returned URL for playback.

Notes & security
- UI checks are not sufficient. You must ensure the streaming backend only serves content if the request contains a valid short-lived token.
- `getStreamToken` is a stub — replace token generation with your streaming provider.

