import { createClient } from '@supabase/supabase-js';
import * as keys from './keys';

// Snapp runs your app in THREE different runtimes:
//   • Snapp iOS      → an HTML bundle inside Safari (browser)  → window.localStorage exists
//   • Snapp Android  → native code execution (no browser)      → AsyncStorage is provided
//                      ambiently by the Snapp runtime instead of localStorage
//   • Standalone app → a real EAS-built SDK 57 binary (App Store / Play) → neither ambient
//                      global exists, so we require the bundled AsyncStorage package directly.
// This adapter picks the right session storage at runtime so the auth session persists in
// ALL THREE. `typeof` checks never throw, and only one branch runs per runtime. In the Snapp
// preview runtimes the third branch is never reached (the require is not evaluated).
declare const localStorage: any;
declare const AsyncStorage: any;

function getAuthStorage() {
  if (typeof localStorage !== 'undefined' && localStorage) {
    return localStorage; // iOS / browser runtime
  }
  if (typeof AsyncStorage !== 'undefined' && AsyncStorage) {
    // Android (Snapp runtime): AsyncStorage is sandboxed per app by the Snapp runtime.
    return {
      getItem: (key: string) => AsyncStorage.getItem(key),
      setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
      removeItem: (key: string) => AsyncStorage.removeItem(key),
    };
  }
  // ⚠️ DO NOT COPY THIS `require()` PATTERN INTO YOUR OWN CODE.
  //
  // It is safe HERE and only here, because of the two `typeof` guards above plus the
  // try/catch below — in the Snapp preview runtimes this line is never evaluated.
  //
  // Everywhere else, use a normal top-level `import`:
  //     import AsyncStorage from '@react-native-async-storage/async-storage';
  //
  // Why it matters: in the Snapp preview the bundle has its own tiny `require()` that only
  // resolves the app's OWN files. Requiring an npm package by name outside these guards throws
  // "Module not found". When that happens inside an async handler it surfaces as an unhandled
  // promise rejection — no error screen, no log, the button simply does nothing. A real app
  // shipped a dead logout button exactly this way (Sentry SNAPP-MOBILE-52).
  //
  // Standalone binary: no ambient global — use the AsyncStorage package bundled by EAS.
  try {
    const NativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (NativeAsyncStorage) {
      return {
        getItem: (key: string) => NativeAsyncStorage.getItem(key),
        setItem: (key: string, value: string) => NativeAsyncStorage.setItem(key, value),
        removeItem: (key: string) => NativeAsyncStorage.removeItem(key),
      };
    }
  } catch {
    // Package not resolvable (e.g. Snapp preview runtime) — fall through to in-memory.
  }
  return undefined; // Fallback: in-memory (session won't persist across restarts)
}

// Credentials are auto-injected into keys.ts when the user connects Supabase.
// Snapp → Settings → Environment'tan gelen değer BOZUK olabilir. Bir kullanıcı buraya
// "proje.supabase.co/rest/vl/" yazdı (https yok, uydurma path) ve `createClient` MODÜL
// YÜKLENİRKEN fırlattığı için app tek bir ekran bile çizemeden çöktü. Kullanıcı sebebini
// göremedi ve kaynak kodda hata olmamasına rağmen AI'a ücretli "düzeltme" yaptırdı.
// Boş değer zaten yedeğe düşüyordu; bozuk değer truthy olduğu için düşmüyordu — artık düşüyor.
// App açılır, sadece Supabase çağrıları çalışmaz ve konsolda ne yapılacağı yazar.
const rawSupabaseUrl = String((keys as any).SUPABASE_URL || '').trim();
const supabaseUrlIsValid = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(rawSupabaseUrl);
if (rawSupabaseUrl && !supabaseUrlIsValid) {
  console.error(
    '[Supabase] Gecersiz SUPABASE_URL: "' + rawSupabaseUrl + '". ' +
    'Snapp > Settings > Environment icinden duzeltin (beklenen: https://projeniz.supabase.co).'
  );
}
const supabaseUrl = supabaseUrlIsValid ? rawSupabaseUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = (keys as any).SUPABASE_ANON_KEY || 'placeholder-anon-key';

// When the backend can't be reached — most often because the Supabase project is PAUSED
// (Supabase auto-pauses free projects after ~1 week idle; its host then stops resolving), or
// simply no internet — the raw error is a scary "fetch failed / UnknownHostException". Translate
// only NETWORK-level failures into one neutral, human sentence so end users never see a stack
// trace on the sign-in screen. Real API errors (auth, RLS, validation) pass through untouched.
async function snappFetch(input: any, init?: any): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err: any) {
    const msg = String((err && err.message) || err || '');
    const isNetwork = /fetch failed|Network request failed|Failed to fetch|UnknownHostException|ENOTFOUND|Unable to resolve host|ERR_NAME_NOT_RESOLVED|network/i.test(msg);
    throw new Error(
      isNetwork
        ? "We can't reach the server right now — it may be waking up. Please try again in a few minutes."
        : msg
    );
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: snappFetch as any },
  auth: {
    storage: getAuthStorage() as any,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Snapp's iOS/web runtime is a WebView. supabase-js otherwise guards auth-token access with
    // the Web Locks API (navigator.locks), which can HANG there — surfacing as "Acquiring an
    // exclusive Navigator LockManager lock '...-auth-token' timed out" and, worse, leaving
    // requests WITHOUT a valid token so they reach Supabase as anon and every RLS-guarded write
    // fails with "new row violates row-level security policy". Replace the lock with an in-process
    // pass-through (one client per app → no cross-context contention to guard).
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
  },
});

// snapp:reset-redirect
// Password reset links go to Snapp's hosted reset page for this app, even when the screen that
// calls resetPasswordForEmail does not pass redirectTo. Without it Supabase falls back to the
// project's Site URL, which is http://localhost:3000 on a new project, and the link in the email
// opens nothing on the phone.
const snappResetPageUrl = String((keys as any).SNAPP_PASSWORD_RESET_URL || '').trim();
if (snappResetPageUrl && supabase && supabase.auth && typeof supabase.auth.resetPasswordForEmail === 'function') {
  const snappResetOriginal = supabase.auth.resetPasswordForEmail.bind(supabase.auth);
  (supabase.auth as any).resetPasswordForEmail = (email: string, options?: { redirectTo?: string; captchaToken?: string }) =>
    snappResetOriginal(email, { ...(options || {}), redirectTo: (options && options.redirectTo) || snappResetPageUrl });
}

// SNAPP SOCIAL LOGIN HELPER (Snapp maintains this block; do not edit it)
//
// Sign in with Google / Apple / GitHub / ... through Supabase OAuth, in all three runtimes:
//   Snapp Android  → expo-web-browser auth session (Chrome Custom Tab), returns to snapp://auth-callback
//   Snapp iOS      → the app runs in Safari: top-level redirect, the session comes back in the page URL
//   Published app  → expo-web-browser auth session, returns to <app scheme>://auth-callback
//
// Every social sign-in button MUST call signInWithProvider(). It first asks the Supabase project
// whether that provider is turned on. When it is not, it shows a plain alert that links to the
// setup guide instead of Supabase's raw "provider is not enabled" error. Turning a provider on
// (Google Cloud / Apple Developer keys pasted into Supabase) is the app owner's job; Snapp cannot
// do it for them, which is why email + password stays the default sign-in.
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Alert, Linking } from 'react-native';

export type SocialProvider =
  | 'google' | 'apple' | 'facebook' | 'github' | 'twitter' | 'discord' | 'azure'
  | 'linkedin_oidc' | 'notion' | 'spotify' | 'slack_oidc' | 'twitch' | 'kakao';

export type SocialSignInStatus =
  | 'signed_in'      // session is set, onAuthStateChange has fired
  | 'redirecting'    // web runtime: the page is navigating to the provider, nothing else to do
  | 'not_configured' // provider is off in Supabase (or Supabase is not connected); alert was shown
  | 'cancelled'      // the user closed the browser sheet
  | 'unavailable'    // this runtime cannot open an auth session (very old Snapp build)
  | 'error';         // alert was shown with the message

export interface SocialSignInResult { ok: boolean; status: SocialSignInStatus; message?: string }

/** Public step-by-step guide for app owners (Google Cloud, Apple, Supabase provider settings). */
export const SOCIAL_LOGIN_GUIDE_URL = 'https://snappai.co/blog/add-google-and-apple-login-to-your-app';

const SOCIAL_PROVIDER_LABELS: Record<string, string> = {
  google: 'Google', apple: 'Apple', facebook: 'Facebook', github: 'GitHub', twitter: 'X',
  discord: 'Discord', azure: 'Microsoft', linkedin_oidc: 'LinkedIn', notion: 'Notion',
  spotify: 'Spotify', slack_oidc: 'Slack', twitch: 'Twitch', kakao: 'Kakao',
};

export function socialProviderLabel(provider: string): string {
  return SOCIAL_PROVIDER_LABELS[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

declare const document: any;
declare const window: any;

/** True when the app runs in a browser (Snapp iOS preview, shared web link); false in native code. */
function snappIsWebRuntime(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined' && !!(window.location && window.location.href);
}

/** Where the provider sends the user back in native runtimes: <scheme>://auth-callback. */
function snappNativeReturnUrl(): string {
  const cfg: any = Constants as any;
  const raw = cfg?.expoConfig?.scheme ?? cfg?.manifest?.scheme ?? cfg?.manifest2?.extra?.expoClient?.scheme;
  const scheme = Array.isArray(raw) ? raw[0] : raw;
  return `${typeof scheme === 'string' && scheme ? scheme : 'snapp'}://auth-callback`;
}

/** Where the provider sends the user back in a browser: this page (top window), without its hash. */
function snappWebReturnUrl(): string {
  let loc: any = window.location;
  try { if (window.top && window.top.location && window.top.location.href) loc = window.top.location; } catch { /* cross-origin top */ }
  return String(loc.href).split('#')[0];
}

let snappAuthSettingsCache: { at: number; external: Record<string, boolean> } | null = null;

/**
 * Is this provider turned on in the app's Supabase project? Reads the public auth settings
 * endpoint (anon key is enough). Returns null when the answer is unknown (offline, paused project).
 */
export async function isSocialProviderEnabled(provider: SocialProvider | string): Promise<boolean | null> {
  if (!supabaseUrlIsValid) return false;
  try {
    if (!snappAuthSettingsCache || Date.now() - snappAuthSettingsCache.at > 60_000) {
      const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: supabaseAnonKey } });
      if (!res.ok) return null;
      const json: any = await res.json();
      snappAuthSettingsCache = { at: Date.now(), external: (json && json.external) || {} };
    }
    return snappAuthSettingsCache.external[String(provider).toLowerCase()] === true;
  } catch {
    return null;
  }
}

/**
 * Open the setup guide. Native: the system browser. Browser runtime: window.open must run while
 * the user's tap is still "fresh" (Safari refuses popups otherwise), so callers keep the path from
 * tap to this call free of awaits when the provider state is already cached; if the popup is still
 * blocked, leave to the guide at the top level.
 */
function snappOpenGuide(): void {
  const url = SOCIAL_LOGIN_GUIDE_URL;
  if (!snappIsWebRuntime()) { Linking.openURL(url).catch(() => {}); return; }
  // No 'noopener' feature on purpose: WebKit then shows "Navigation was blocked by
  // Cross-Origin-Opener-Policy" for the popup (measured 2026-10-03 in the iOS simulator).
  let popup: any = null;
  try { popup = window.open(url, '_blank'); } catch { popup = null; }
  if (popup) return;
  // Popup blocked (Safari does this once the tap is no longer "fresh"): show a real link the user
  // can tap. It opens in the TOP window (no popup, no opener policy involved); Back returns.
  try {
    const doc = document;
    const old = doc.getElementById('snapp-social-guide');
    if (old) old.remove();
    const bar = doc.createElement('div');
    bar.id = 'snapp-social-guide';
    bar.setAttribute('style', 'position:fixed;left:12px;right:12px;bottom:16px;z-index:2147483647;background:#111827;color:#f9fafb;border-radius:12px;padding:14px 16px;font:15px -apple-system,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);display:flex;align-items:center;gap:12px');
    const link = doc.createElement('a');
    link.href = url; link.target = '_top';
    link.textContent = 'Open the setup guide';
    link.setAttribute('style', 'color:#67e8f9;font-weight:600;text-decoration:underline;flex:1');
    const close = doc.createElement('button');
    close.type = 'button'; close.textContent = 'Close';
    close.setAttribute('style', 'background:transparent;border:1px solid #4b5563;color:#e5e7eb;border-radius:8px;padding:6px 10px;font:14px -apple-system,system-ui,sans-serif');
    close.onclick = () => bar.remove();
    link.onclick = () => { setTimeout(() => bar.remove(), 300); };
    bar.appendChild(link); bar.appendChild(close);
    doc.body.appendChild(bar);
  } catch {
    try { (window.top || window).location.assign(url); } catch { /* nothing left to try */ }
  }
}

/** Cached answer (any age up to 5 minutes) so the tap handler can decide without an await. */
function snappCachedProviderState(provider: string): boolean | null {
  if (!snappAuthSettingsCache || Date.now() - snappAuthSettingsCache.at > 5 * 60_000) return null;
  return snappAuthSettingsCache.external[String(provider).toLowerCase()] === true;
}

function snappShowSocialSetupAlert(provider: string, noDatabase?: boolean): void {
  const name = socialProviderLabel(provider);
  const message = noDatabase
    ? `This app is not connected to a Supabase project yet, so ${name} sign-in cannot work. Connect Supabase in Snapp (Settings, then Environment), then turn ${name} sign-in on in that project. The guide shows every step.`
    : `${name} sign-in has not been set up for this app yet. The app owner needs to turn ${name} on in the app's Supabase project (Authentication, then Sign In / Providers) with their own ${name} keys. The guide shows every step.`;
  Alert.alert(`${name} sign-in is not set up`, message, [
    { text: 'Not now', style: 'cancel' },
    { text: 'Open guide', onPress: snappOpenGuide },
  ]);
}

function snappParseAuthParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const hashIdx = url.indexOf('#');
  const queryIdx = url.indexOf('?');
  const hash = hashIdx >= 0 ? url.slice(hashIdx + 1) : '';
  const query = queryIdx >= 0 ? url.slice(queryIdx + 1, hashIdx >= 0 && hashIdx > queryIdx ? hashIdx : undefined) : '';
  for (const part of `${hash}&${query}`.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const key = eq >= 0 ? part.slice(0, eq) : part;
    const value = eq >= 0 ? part.slice(eq + 1) : '';
    try { out[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' ')); } catch { out[key] = value; }
  }
  return out;
}

/**
 * Turn the URL the provider sent us back to into a Supabase session. Handles the implicit flow
 * (#access_token & #refresh_token) and the PKCE flow (?code). Safe to call with any URL.
 */
export async function completeSocialSignInFromUrl(url: string): Promise<{ ok: boolean; message?: string }> {
  const p = snappParseAuthParams(String(url || ''));
  if (p.error_description || p.error) return { ok: false, message: p.error_description || p.error };
  if (p.access_token && p.refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token });
    return error ? { ok: false, message: error.message } : { ok: true };
  }
  if (p.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(p.code);
    return error ? { ok: false, message: error.message } : { ok: true };
  }
  return { ok: false, message: 'No session in the returned URL' };
}

/**
 * Sign in with a social provider. Call this from the button's onPress and branch on the result:
 *   const r = await signInWithProvider('google');
 *   if (r.ok) { ... }   // session is set (or, on web, the page is redirecting)
 * Alerts for the "not set up" / error cases are shown here; the caller only handles success.
 */
export async function signInWithProvider(
  provider: SocialProvider,
  options?: { scopes?: string; queryParams?: Record<string, string> },
): Promise<SocialSignInResult> {
  if (!supabaseUrlIsValid) {
    snappShowSocialSetupAlert(provider, true);
    return { ok: false, status: 'not_configured' };
  }
  // Decide from the cache when we can: no await between the tap and the alert keeps the browser's
  // user activation alive for "Open guide" (window.open) on the web runtime.
  const cachedState = snappCachedProviderState(provider);
  const enabled = cachedState !== null ? cachedState : await isSocialProviderEnabled(provider);
  if (enabled === false) {
    snappShowSocialSetupAlert(provider);
    return { ok: false, status: 'not_configured' };
  }

  const web = snappIsWebRuntime();
  const redirectTo = web ? snappWebReturnUrl() : snappNativeReturnUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as any,
    options: { redirectTo, skipBrowserRedirect: true, scopes: options?.scopes, queryParams: options?.queryParams },
  });
  if (error || !data?.url) {
    const message = String((error && error.message) || 'Could not start sign-in');
    if (/not enabled|unsupported provider/i.test(message)) {
      snappShowSocialSetupAlert(provider);
      return { ok: false, status: 'not_configured', message };
    }
    Alert.alert('Sign-in failed', message);
    return { ok: false, status: 'error', message };
  }

  if (web) {
    // Browser runtime: leave at the TOP level. Google refuses to sign in inside an iframe, and
    // the session comes back in this page's URL (see snappRestoreSocialSessionFromPageUrl).
    try { (window.top || window).location.assign(data.url); } catch { window.location.assign(data.url); }
    return { ok: true, status: 'redirecting' };
  }

  const browser: any = typeof WebBrowser !== 'undefined' ? WebBrowser : null;
  if (!browser || typeof browser.openAuthSessionAsync !== 'function') {
    Alert.alert('Update needed', 'Please update the Snapp app to use social sign-in.');
    return { ok: false, status: 'unavailable' };
  }
  const result: any = await browser.openAuthSessionAsync(data.url, redirectTo);
  if (result && result.type === 'success' && result.url) {
    const done = await completeSocialSignInFromUrl(result.url);
    if (done.ok) return { ok: true, status: 'signed_in' };
    Alert.alert('Sign-in failed', done.message || 'Could not finish sign-in');
    return { ok: false, status: 'error', message: done.message };
  }
  return { ok: false, status: 'cancelled' };
}

/** Browser runtime only: finish a sign-in whose tokens arrived in the page URL, then clean the URL. */
function snappRestoreSocialSessionFromPageUrl(): void {
  if (!snappIsWebRuntime()) return;
  const candidates: any[] = [{ loc: window.location, history: window.history }];
  try {
    if (window.top && window.top !== window && window.top.location && window.top.location.href) {
      candidates.push({ loc: window.top.location, history: window.top.history }
