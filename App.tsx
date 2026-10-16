import React, { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  Platform,
} from "react-native";
import * as Application from "expo-application";

/**
 * Clean, minimal, and robust App.tsx scaffold for this project.
 * - Avoids top-level firebase imports to prevent bundler/compile issues.
 * - Initializes Firebase (if present) lazily at runtime.
 * - Provides placeholder auth/admin/force-update UI and safe fallbacks.
 *
 * Usage:
 * - Replace the file in your repo with this content.
 * - If you want full firebase behavior, add firebase config and implement
 *   the `initFirebase()` TODOs below (we intentionally keep types `any`
 *   to avoid compile-time coupling to a specific firebase SDK version).
 */

/* -- Types used locally (kept loose for compatibility) -- */
type Maybe<T> = T | null;
type FirebaseHandles = {
  app?: any;
  auth?: any;
  db?: any;
  functions?: any;
};

/* -- Lazy initialize Firebase (if firebase SDK is installed) --
   This tries to dynamically import firebase packages at runtime.
   If your project uses react-native-firebase or expo-firebase, adapt here.
*/
async function initFirebase(firebaseConfig: any): Promise<FirebaseHandles> {
  try {
    // Try modular web SDK (firebase v9+)
    // Note: dynamic import keeps bundlers from failing if firebase is not installed.
    // If your project uses another firebase package, replace this block.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const firebaseAppModule = await import("firebase/app");
    const firebaseAuthModule = await import("firebase/auth");
    const firebaseDatabaseModule = await import("firebase/database");
    const firebaseFunctionsModule = await import("firebase/functions");

    const { initializeApp, getApps } = firebaseAppModule;
    if (!getApps || getApps().length === 0) {
      initializeApp(firebaseConfig);
    } else {
      // If the app is already initialized, we still proceed.
    }

    const auth = firebaseAuthModule.getAuth
      ? firebaseAuthModule.getAuth()
      : firebaseAuthModule.auth && firebaseAuthModule.auth();

    const db = firebaseDatabaseModule.getDatabase
      ? firebaseDatabaseModule.getDatabase()
      : firebaseDatabaseModule.database && firebaseDatabaseModule.database();

    const functions = firebaseFunctionsModule.getFunctions
      ? firebaseFunctionsModule.getFunctions()
      : firebaseFunctionsModule.functions && firebaseFunctionsModule.functions();

    return { app: {}, auth, db, functions };
  } catch (err) {
    // If dynamic import failed (firebase not installed or incompatible), return empty handles.
    // Caller should handle absence of firebase gracefully.
    // Keep error logging minimal to avoid leaking secrets in CI logs.
    // eslint-disable-next-line no-console
    console.warn("Firebase not initialized (dynamic import failed).", (err && String(err)) || "");
    return {};
  }
}

export default function App(): JSX.Element {
  const [initializing, setInitializing] = useState<boolean>(true);
  const [firebaseReady, setFirebaseReady] = useState<boolean>(false);
  const [fbHandles, setFbHandles] = useState<FirebaseHandles>({});

  const [userId, setUserId] = useState<Maybe<string>>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const [localVersion, setLocalVersion] = useState<Maybe<string>>(null);
  const [remoteVersion, setRemoteVersion] = useState<Maybe<string>>(null);
  const [forceUpdateUrl, setForceUpdateUrl] = useState<Maybe<string>>(null);
  const [forceRequired, setForceRequired] = useState<boolean>(false);

  // ---- Replace with your actual firebase config if you want automatic init ----
  // Keep it empty here to avoid committing secrets. If you want runtime init,
  // set this from an env module or a secure source.
  const firebaseConfig: any = {
    // apiKey: "<YOUR_API_KEY>",
    // authDomain: "<YOUR_AUTH_DOMAIN>",
    // databaseURL: "<YOUR_DATABASE_URL>",
    // projectId: "<YOUR_PROJECT_ID>",
    // storageBucket: "<YOUR_STORAGE_BUCKET>",
    // messagingSenderId: "<YOUR_MESSAGING_SENDER_ID>",
    // appId: "<YOUR_APP_ID>",
  };

  // Read app version (Expo-friendly). Safe fallback for non-expo environments.
  useEffect(() => {
    try {
      const v =
        (Application && (Application.nativeApplicationVersion || Application.applicationVersion)) ||
        null;
      setLocalVersion(v);
    } catch (e) {
      setLocalVersion(null);
    }
  }, []);

  // Initialize Firebase lazily (no top-level import)
  useEffect(() => {
    let mounted = true;
    (async () => {
      // If firebaseConfig is empty, we will still try the dynamic import (in case SDK auto-configured)
      const handles = await initFirebase(firebaseConfig);
      if (!mounted) return;
      setFbHandles(handles);
      setFirebaseReady(Boolean(handles && (handles.auth || handles.db || handles.functions)));
      setInitializing(false);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Example: If firebase auth is available, set up a basic auth listener.
  useEffect(() => {
    if (!fbHandles || !fbHandles.auth) {
      // no-op when firebase auth is not available
      return undefined;
    }

    try {
      const unsub =
        typeof fbHandles.auth.onAuthStateChanged === "function"
          ? fbHandles.auth.onAuthStateChanged((u: any) => {
              if (u && u.uid) {
                setUserId(u.uid);
                // best-effort claim check if SDK exposes getIdTokenResult
                if (typeof fbHandles.auth.currentUser?.getIdTokenResult === "function") {
                  fbHandles.auth.currentUser
                    .getIdTokenResult()
                    .then((t: any) => {
                      setIsAdmin(Boolean(t?.claims?.admin));
                    })
                    .catch(() => setIsAdmin(false));
                } else {
                  setIsAdmin(false);
                }
              } else {
                setUserId(null);
                setIsAdmin(false);
              }
            })
          : // fallback API: if auth doesn't expose onAuthStateChanged, skip
            undefined;

      return () => {
        try {
          if (typeof unsub === "function") unsub();
        } catch (e) {
          // ignore
        }
      };
    } catch (e) {
      // ignore initialization errors
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbHandles]);

  // Listen to remote version and forceUpdateUrl if realtime DB available
  useEffect(() => {
    if (!fbHandles || !fbHandles.db) return undefined;

    try {
      const versionRef = fbHandles.db.ref ? fbHandles.db.ref("/current_version") : null;
      const urlRef = fbHandles.db.ref ? fbHandles.db.ref("/force_update_url") : null;

      const onVersion = (snap: any) => {
        try {
          setRemoteVersion(snap ? snap.val() : null);
        } catch {
          setRemoteVersion(null);
        }
      };
      const onUrl = (snap: any) => {
        try {
          setForceUpdateUrl(snap ? snap.val() : null);
        } catch {
          setForceUpdateUrl(null);
        }
      };

      if (versionRef && typeof versionRef.on === "function") {
        versionRef.on("value", onVersion);
      }
      if (urlRef && typeof urlRef.on === "function") {
        urlRef.on("value", onUrl);
      }

      return () => {
        try {
          if (versionRef && typeof versionRef.off === "function") {
            versionRef.off();
          }
          if (urlRef && typeof urlRef.off === "function") {
            urlRef.off();
          }
        } catch {
          // ignore
        }
      };
    } catch {
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbHandles]);

  // Derive forceRequired using simple numeric parsing (major.minor.patch)
  const parseVersionNumber = useCallback((v: Maybe<string>): number => {
    if (!v) return 0;
    const parts = v.split(".").map((p) => parseInt(p, 10) || 0);
    while (parts.length < 3) parts.push(0);
    // weight: major*1e6 + minor*1e3 + patch
    return parts[0] * 1_000_000 + parts[1] * 1_000 + parts[2];
  }, []);

  useEffect(() => {
    try {
      const r = parseVersionNumber(remoteVersion);
      const l = parseVersionNumber(localVersion);
      setForceRequired(r > l);
    } catch {
      setForceRequired(false);
    }
  }, [remoteVersion, localVersion, parseVersionNumber]);

  // ---- Auth helpers (if firebase available) ----
  async function signInAnonymouslySafe() {
    if (!fbHandles || !fbHandles.auth) {
      Alert.alert("Unavailable", "Firebase Auth is not available in this build.");
      return;
    }
    setBusy(true);
    try {
      if (typeof fbHandles.auth.signInAnonymously === "function") {
        await fbHandles.auth.signInAnonymously();
      } else if (typeof fbHandles.auth.signInWithCustomToken === "function") {
        // fallback if API differs
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        await fbHandles.auth.signInWithCustomToken("anonymous-token-placeholder");
      } else {
        Alert.alert("Unsupported", "Auth SDK present but method not supported.");
      }
    } catch (err: any) {
      Alert.alert("Auth error", String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function signInWithEmailSafe(emailArg: string, passwordArg: string) {
    if (!fbHandles || !fbHandles.auth) {
      Alert.alert("Unavailable", "Firebase Auth is not available in this build.");
      return;
    }
    setBusy(true);
    try {
      if (typeof fbHandles.auth.signInWithEmailAndPassword === "function") {
        await fbHandles.auth.signInWithEmailAndPassword(emailArg, passwordArg);
      } else {
        Alert.alert("Unsupported", "Auth SDK present but method not supported.");
      }
    } catch (err: any) {
      Alert.alert("Auth error", String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function signOutSafe() {
    if (!fbHandles || !fbHandles.auth) {
      Alert.alert("Unavailable", "Firebase Auth is not available in this build.");
      return;
    }
    setBusy(true);
    try {
      if (typeof fbHandles.auth.signOut === "function") {
        await fbHandles.auth.signOut();
      }
    } catch (err: any) {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  // Admin write demo (safe no-op if DB not available)
  async function adminWriteSafe() {
    if (!isAdmin) {
      Alert.alert("Permission denied", "You are not an admin.");
      return;
    }
    if (!fbHandles || !fbHandles.db) {
      Alert.alert("Unavailable", "Realtime DB not available in this build.");
      return;
    }
    setBusy(true);
    try {
      const ref = fbHandles.db.ref ? fbHandles.db.ref("/content/admin_demo") : null;
      if (ref && typeof ref.set === "function") {
        await ref.set({
          updatedAt: new Date().toISOString(),
          updatedBy: userId,
          note: "Admin demo write",
        });
        Alert.alert("Success", "Admin write completed.");
      } else {
        Alert.alert("Unsupported", "DB API present but method not supported.");
      }
    } catch (err: any) {
      Alert.alert("Write error", String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  // Call cloud function getStreamToken if available
  async function callGetStreamTokenSafe() {
    if (!fbHandles || !fbHandles.functions) {
      Alert.alert("Unavailable", "Cloud Functions not available in this build.");
      return;
    }
    setBusy(true);
    try {
      const callableName = "getStreamToken";
      // try the callable API if available
      if (typeof fbHandles.functions.httpsCallable === "function") {
        const callable = fbHandles.functions.httpsCallable(callableName);
        const res = await callable({ streamId: "demo" });
        Alert.alert("Function result", JSON.stringify(res?.data || res));
      } else if (typeof fbHandles.functions.callable === "function") {
        // alternative API shape
        const res = await fbHandles.functions.callable(callableName)({ streamId: "demo" });
        Alert.alert("Function result", JSON.stringify(res?.data || res));
      } else {
        Alert.alert("Unsupported", "Functions SDK present but callable API not detected.");
      }
    } catch (err: any) {
      Alert.alert("Function error", String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  // UI actions for opening update link
  function openUpdateLink(url: Maybe<string>) {
    if (!url) {
      Alert.alert("No link", "No update URL available.");
      return;
    }
    Linking.canOpenURL(url)
      .then((ok) => {
        if (!ok) {
          Alert.alert("Cannot open", url);
          return;
        }
        Linking.openURL(url).catch((e) => {
          Alert.alert("Open URL failed", String(e));
        });
      })
      .catch((e) => {
        Alert.alert("Open URL failed", String(e));
      });
  }

  // Render
  if (initializing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.text}>Initializing app...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Arshia TV — Minimal App Shell</Text>

        {forceRequired && (
          <View style={styles.forceBox}>
            <Text style={styles.forceTitle}>Force Update Required</Text>
            <Text style={styles.textSmall}>
              Your app version {localVersion ?? "unknown"} is older than required {remoteVersion}.
            </Text>
            <View style={styles.row}>
              <Button title="Update" onPress={() => openUpdateLink(forceUpdateUrl)} />
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.h2}>Authentication</Text>
          <Text style={styles.textSmall}>User id: {userId ?? "not signed in"}</Text>
          <Text style={styles.textSmall}>Admin: {isAdmin ? "yes" : "no"}</Text>

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!busy}
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
            editable={!busy}
          />

          <View style={styles.row}>
            <Button title="Sign in (email)" onPress={() => signInWithEmailSafe(email.trim(), password)} />
            <View style={{ width: 10 }} />
            <Button title="Sign in (anon)" onPress={signInAnonymouslySafe} />
          </View>
          <View style={{ height: 8 }} />
          <Button title="Sign out" onPress={signOutSafe} color="#cc0000" />
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Admin / Functions</Text>
          <Text style={styles.textSmall}>
            Admin actions require custom claim admin:true and realtime DB write permission.
          </Text>
          <View style={styles.row}>
            <Button title="Admin write" onPress={adminWriteSafe} disabled={!isAdmin || busy} />
            <View style={{ width: 10 }} />
            <Button title="Call getStreamToken" onPress={callGetStreamTokenSafe} disabled={busy} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Debug Info</Text>
          <Text style={styles.textSmall}>Local version: {localVersion ?? "unknown"}</Text>
          <Text style={styles.textSmall}>Remote version: {remoteVersion ?? "not set"}</Text>
          <Text style={styles.textSmall}>Force URL: {forceUpdateUrl ?? "none"}</Text>
          <Text style={styles.textSmall}>Firebase ready: {firebaseReady ? "yes" : "no"}</Text>
        </View>

        <View style={{ height: 20 }} />
        {(busy || false) && <ActivityIndicator />}
      </ScrollView>
    </SafeAreaView>
  );
}

/* -- Styles -- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fafafa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  h2: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  textSmall: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  forceBox: {
    backgroundColor: "#fff4f4",
    borderColor: "#ffbdbd",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  forceTitle: {
    color: "#a00",
    fontWeight: "700",
    marginBottom: 6,
  },
});
