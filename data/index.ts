import { registerRootComponent } from 'expo';
import App from './App';

// Standalone entry point (EAS Build / expo run) for SDK 57.
// The Snapp preview runtime does NOT use this file — its server-side bundler
// (metro-bundle-adapter) resolves `App.tsx` directly and ignores package.json "main".
// So this registration only runs in a real standalone binary, where Expo needs a
// registered root component. Keeping it here makes the same source tree buildable
// both inside Snapp and as an independent App Store / Play Store app.
registerRootComponent(App);

