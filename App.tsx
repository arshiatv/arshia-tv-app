import React, { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Button,
  ActivityIndicator,
  StyleSheet,
  Platform,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import * as Application from "expo-application";

// Firebase (modular v9+)
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  User,
  getIdTokenResult,
} from "firebase/auth";
import {
  getDatabase,
  ref as dbRef,
  onValue,
  set as dbSet,
  get as dbGet,
} from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * IMPORTANT:
 * Replace the firebaseConfig below with your project's config.
 * Do NOT commit long-lived secrets or service account keys to source.
 */
const firebaseConfig = {
  apiKey: "<YOUR_API_KEY>",
  authDomain: "<YOUR_AUTH_DOMAIN>",
  databaseURL: "<YOUR_DATABASE_URL>", // required for Realtime DB
  projectId: "<YOUR_PROJECT_ID>",
  storageBucket: "<YOUR_STORAGE_BUCKET>",
  messagingSenderId: "<YOUR_MESSAGING_SENDER_ID>",
  appId: "<YOUR_APP_ID>",
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const auth = getAuth();
const database = getDatabase();
const functions = getFunctions();

function parseVersion(version: string | null | undefined): number {
  // Simplistic version parsing: "1.2.3" -> 1002003 numeric for comparison
  if (!version) return 0;
  const parts = version.split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts[0] * 1_000_000 + parts[1] * 1_000 + parts[2];
}

export default function App(): JSX.Element {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingToken, setLoadingToken] = useState(false);

  // Force update state from DB
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [forceUpdateUrl, setForceUpdateUrl] = useState<string | null>(null);
  const [localVersion, setLocalVersion] = useState<string | null>(null);
  const [forceRequired, setForceRequired] = useState(false);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // get app version (expo)
    try {
      const v = Application.nativeApplicationVersion || Application.applicationVersion || null;
      setLocalVersion(v);
    } catch (e) {
      setLocalVersion(null);
    }
  }, []);

  // Auth observer
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAdmin(false);

      if (u) {
        // Check custom claims for admin
        try {
          const idTokenResult = await getIdTokenResult(u, /* forceRefresh */ false);
          const claims: any = idTokenResult?.claims || {};
          if (claims.admin === true || claims["admin"] === true) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (err) {
          console.warn("Failed to get ID token result", err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

      if (initializing) setInitializing(false);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for remote version and force URL in Realtime DB
  useEffect(() => {
    const versionRef = dbRef(database, "/current_version");
    const urlRef = dbRef(database, "/force_update_url");

    const unsubV = onValue(versionRef, (snap) => {
      const val = snap.val();
      setRemoteVersion(val ?? null);
    });

    const unsubU = onValue(urlRef, (snap) => {
      const val = snap.val();
      setForceUpdateUrl(val ?? null);
    });

    return () => {
      // firebase onValue returns function unsub? We used onValue which returns callback unregister via off by ref
      try {
        // best-effort cleanup
        unsubV();
      } catch (e) {}
      try {
        unsubU();
      } catch (e) {}
    };
  }, []);

  // Evaluate if a force update is required whenever versions change
  useEffect(() => {
    if (!remoteVersion) {
      setForceRequired(false);
      return;
    }
    const remoteNum = parseVersion(remoteVersion);
    const localNum = parseVersion(localVersion ?? "0.0.0");
    setForceRequired(remoteNum > localNum);
  }, [remoteVersion, localVersion]);

  const loginAnon = useCallback(async () => {
    setBusy(true);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      Alert.alert("Sign-in error", err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const loginEmail = useCallback(async () => {
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setEmail("");
      setPassword("");
    } catch (err: any) {
      Alert.alert("Sign-in error", err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }, [email, password]);

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.warn("Sign out error", err);
    } finally {
      setBusy(false);
    }
  }, []);

  // Admin function: set a key in DB safely
  const adminWrite = useCallback(async () => {
    if (!isAdmin || !user) {
      Alert.alert("Permission", "You are not an admin.");
      return;
    }
    try {
      setBusy(true);
      const contentRef = dbRef(database, "/content/example_admin_entry");
      await dbSet(contentRef, {
        updatedBy: user.uid,
        title: "Admin entry",
        updatedAt: new Date().toISOString(),
      });
      Alert.alert("Success", "Admin write completed.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }, [isAdmin, user]);

  // Call Cloud Function getStreamToken (must be deployed)
  const getStreamToken = useCallback(async () => {
    setLoadingToken(true);
    try {
      const fn = getFunctions();
      const callable = httpsCallable(fn, "getStreamToken");
      // Example payload - adjust according to your function signature
      const res = await callable({ streamId: "example-stream-1" });
      const data = res.data;
      Alert.alert("Stream token", JSON.stringify(data));
      return data;
    } catch (err: any) {
      Alert.alert("Function error", err?.message ?? String(err));
      return null;
    } finally {
      setLoadingToken(false);
    }
  }, []);

  // Minimal UI for force update modal / screen
  const renderForceUpdate = () => {
    if (!forceRequired) return null;
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Update required</Text>
        <Text style={styles.text}>A new version is required to continue using this app.</Text>
        {forceUpdateUrl ? (
          <Button
            title="Open update page"
            onPress={() => {
              try {
                // Use Linking to open store link
                const url = forceUpdateUrl;
                if (url) {
                  // eslint-disable-next-line @typescript-eslint/no-floating-promises
                  (async () => {
                    const supported = await (await import("react-native")).Linking.canOpenURL(url);
                    if (supported) {
                      (await import("react-native")).Linking.openURL(url);
                    } else {
                      Alert.alert("Cannot open URL", url);
                    }
                  })();
                }
              } catch (e) {
                Alert.alert("Error opening URL", String(e));
              }
            }}
          />
        ) : null}
      </View>
    );
  };

  if (initializing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator />
        <Text style={styles.text}>Initializing...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Arshia TV App (Demo)</Text>

        {forceRequired ? (
          <View style={styles.forceBox}>
            <Text style={styles.forceTitle}>Force Update Required</Text>
            <Text style={styles.text}>
              Your app version ({localVersion ?? "unknown"}) is older than required ({remoteVersion}).
            </Text>
            {forceUpdateUrl ? (
              <Button
                title="Update Now"
                onPress={() => {
                  if (forceUpdateUrl) {
                    Linking.openURL(forceUpdateUrl).catch(() =>
                      Alert.alert("Cannot open update URL", forceUpdateUrl ?? "")
                    );
                  }
                }}
              />
            ) : (
              <Text style={styles.text}>No update link provided by admin.</Text>
            )}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.subtitle}>Auth</Text>
          {user ? (
            <>
              <Text style={styles.text}>Signed in as: {user.uid}</Text>
              <Text style={styles.text}>Admin: {isAdmin ? "Yes" : "No"}</Text>
              <View style={styles.row}>
                <Button title="Sign out" onPress={logout} />
                <View style={{ width: 12 }} />
                <Button
                  title="Get Stream Token"
                  onPress={() => {
                    void getStreamToken();
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                style={styles.input}
                secureTextEntry
              />
              <View style={styles.row}>
                <Button title="Sign in" onPress={loginEmail} disabled={busy} />
                <View style={{ width: 12 }} />
                <Button title="Sign in anonymously" onPress={loginAnon} disabled={busy} />
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Admin Actions</Text>
          <Text style={styles.text}>Use only if you are an admin (custom claim: admin:true).</Text>
          <Button title="Write admin content" onPress={adminWrite} disabled={!isAdmin || busy} />
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Debug / Info</Text>
          <Text style={styles.text}>Local version: {localVersion ?? "unknown"}</Text>
          <Text style={styles.text}>Remote required version: {remoteVersion ?? "not set"}</Text>
          <Text style={styles.text}>Force update URL: {forceUpdateUrl ?? "not set"}</Text>
        </View>

        <View style={{ height: 40 }} />
        {busy || loadingToken ? <ActivityIndicator /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  section: {
    marginVertical: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#eee",
  },
  text: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    marginBottom: 8,
    borderRadius: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  forceBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff4f4",
    borderWidth: 1,
    borderColor: "#ffcccc",
    marginBottom: 12,
  },
  forceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#a00",
    marginBottom: 6,
  },
});
