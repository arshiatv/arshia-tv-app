# Force Update + Realtime Movies/Series + Auth Gate

This branch adds a strict Force Update mechanism tied to Firebase Realtime Database and realtime subscriptions for Movies and Series with a mandatory Auth Gate.

Files added/updated in this branch:
- App.tsx (new root wrapper with strict force-update behavior)
- src/utils/version.ts
- src/hooks/useRealtimeList.ts
- src/components/AuthGate.tsx
- src/screens/MoviesPage.tsx
- src/screens/SeriesPage.tsx

## Key behaviors
- App reads `/current_version` and `/force_update_url` from Realtime DB.
- If local app version is older than required, the entire UI is blocked with a non-dismissible screen prompting update.
- Force update is strict: if the required version cannot be read (offline or error), the app is blocked to prevent bypass.
- Movies and Series pages subscribe to `/content/persian/movies` and `/content/persian/series` respectively and update in realtime.
- Movies/Series pages are protected by an AuthGate; guest users cannot view or stream content.

## Install & Test
1. Install deps:
   - `yarn add @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/database react-native-device-info semver`
   - `npx pod-install ios`
2. Ensure Firebase config files are present for iOS/Android (GoogleService-Info.plist, google-services.json)
3. Push branch and open PR
4. DB sample values:
   - `/current_version` = "2.1.0"
   - `/force_update_url` = "https://play.google.com/store/apps/details?id=com.myapp"
   - `/content/persian/movies` = { ... }
   - `/content/persian/series` = { ... }

## Security
- UI-only checks are not sufficient for protecting streams. Use server-side token protection or Firebase Rules to restrict access to stream URLs.

