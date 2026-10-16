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
} from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";

// Project's lightweight Firebase helper (REST-based)
import { fbGet, fbSet, createPollListener } from "services/firebase";

/**
 * Clean App.tsx compatible with the repo's existing Firebase REST helper.
 * - Reads /current_version and /force_update_url from Realtime DB via services/firebase.ts
 * - Admin unlock uses pin stored at /pin (AdminPage expects same behavior)
 * - No firebase SDK imports to avoid mismatches with package.json
 */

// Parse version like "1.2.3" -> numeric comparable value
function versionToNumber(v?: string | null): number {
  if (!v) return 0;
  const parts = v.split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts[0] * 1_000_000 + parts[1] * 1_000 + parts[2];
}

export default function App(): JSX.Element {
  const [initializing, setInitializing] = useState(true);

  // app version
  const [localVersion, setLocalVersion] = useState<string | null>(null);

  // remote config from RTDB
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [forceUpdateUrl, setForceUpdateUrl] = useState<string | null>(null);
  const [forceRequired, setForceRequired] = useState(false);

  // admin PIN flow (simple unlock)
  const [pinInput, setPinInput] = useState("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // ui state
  const [busy, setBusy] = useState(false);

  // get firebase url from expo config if present (fallback in services/firebase.ts will also use default)
  const firebaseUrlFromConfig =
    (Constants?.manifest?.extra && (Constants.manifest.extra as any).firebaseUrl) ||
    (Constants?.expoConfig?.extra && (Constants?.expoConfig!.extra as any).firebaseUrl) ||
    null;

  // set local app version on mount (expo)
  useEffect(() => {
    try {
      const v =
        (Application && (Application.nativeApplicationVersion || Application.applicationVersion)) ||
        (Constants?.manifest?.version as string) ||
        null;
      setLocalVersion(v ?? null);
    } catch {
      setLocalVersion(null);
    }
  }, []);

  // initialize listeners for current_version and force_update_url using createPollListener
  useEffect(() => {
    let versionListener: ReturnType<typeof createPollListener> | null = null;
    let urlListener: ReturnType<typeof createPollListener> | null = null;

    try {
      // createPollListener takes a path relative to the DB root, e.g. "current_version"
      versionListener = createPollListener("current_version", 3000);
      urlListener = createPollListener("force_update_url", 3000);

      versionListener.start((data: any) => {
        // fb REST returns raw values; we accept string or numeric
        const val = data ?? null;
        setRemoteVersion(val === null ? null : String(val));
      });

      urlListener.start((data: any) => {
        const val = data ?? null;
        setForceUpdateUrl(val === null ? null : String(val));
      });
    } catch (err) {
      // If polling creation fails, fall back to occasional fetch
      // (but avoid throwing — app should still run)
      // eslint-disable-next-line no-console
      console.warn("Polling not available, will fallback to manual fetch.", err);
      const id = setInterval(async () => {
        try {
          const rv = await fbGet("current_version");
          setRemoteVersion(rv == null ? null : String(rv));
          const ru = await fbGet("force_update_url");
          setForceUpdateUrl(ru == null ? null : String(ru));
        } catch {
          // ignore fetch errors
        }
      }, 5000);
      return () => clearInterval(id);
    }

    setInitializing(false);

    return () => {
      try {
        versionListener && versionListener.stop();
      } catch {}
      try {
        urlListener && urlListener.stop();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // compute forceRequired whenever versions update
  useEffect(() => {
    const r = versionToNumber(remoteVersion);
    const l = versionToNumber(localVersion);
    setForceRequired(r > l);
  }, [remoteVersion, localVersion]);

  // Admin unlock: compare entered PIN with /pin in RTDB (AdminPage expects root.pin)
  const unlockAdmin = useCallback(async () => {
    setBusy(true);
    try {
      const remote = await fbGet("pin"); // expects root.pin value
      const remotePin = remote ?? null;
      if (!remotePin) {
        Alert.alert("No PIN set", "Admin PIN is not configured in remote database.");
        setBusy(false);
        return;
      }
      if (String(pinInput).trim() === String(remotePin).trim()) {
        setIsAdminUnlocked(true);
        setPinInput("");
        Alert.alert("Unlocked", "Admin area unlocked.");
      } else {
        Alert.alert("Invalid PIN", "The PIN you entered is incorrect.");
      }
    } catch (err: any) {
      Alert.alert("Error", String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  }, [pinInput]);

  const lockAdmin = useCallback(() => {
    setIsAdminUnlocked(false);
  }, []);

  // Admin demo write (writes example_admin_entry under /content)
  const adminWriteDemo = useCallback(async () => {
    if (!isAdminUnlocked) {
      Alert.alert("Not unlocked", "Unlock admin area first.");
      return;
    }
    setBusy(true);
    try {
      await fbSet("content/example_admin_entry", {
        updatedAt: Date.now(),
        note: "Written from app admin demo",
      });
      Alert.alert("Success", "Admin write completed.");
    } catch (err: any) {
      Alert.alert("Write error", String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  }, [isAdminUnlocked]);

  // Simple handler to open update URL
  const openUpdate = useCallback((url?: string | null) => {
    if (!url) {
      Alert.alert("No update URL", "There is no update URL set by admin.");
      return;
    }
    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          Alert.alert("Cannot open URL", url);
          return;
        }
        Linking.openURL(url).catch((e) => Alert.alert("Open failed", String(e)));
      })
      .catch((e) => Alert.alert("Open failed", String(e)));
  }, []);

  // UI
  if (initializing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.text}>Initializing…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Arshia TV — App Shell</Text>

        {forceRequired && (
          <View style={styles.forceBox}>
            <Text style={styles.forceTitle}>Update required</Text>
            <Text style={styles.text}>
              Your version {localVersion ?? "unknown"} is older than required {remoteVersion}.
            </Text>
            <Button title="Open update page" onPress={() => openUpdate(forceUpdateUrl)} />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.h2}>Admin Unlock</Text>
          <Text style={styles.text}>
            This uses the PIN stored at the database path "/pin" (root). AdminPage uses the same.
          </Text>
          {!isAdminUnlocked ? (
            <>
              <TextInput
                placeholder="Enter admin PIN"
                value={pinInput}
                onChangeText={setPinInput}
                style={styles.input}
                keyboardType="number-pad"
                editable={!busy}
              />
              <View style={styles.row}>
                <Button title="Unlock" onPress={unlockAdmin} disabled={busy || !pinInput.trim()} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.text}>Admin area unlocked.</Text>
              <View style={styles.row}>
                <Button title="Admin write demo" onPress={adminWriteDemo} disabled={busy} />
                <View style={{ width: 10 }} />
                <Button title="Lock" onPress={lockAdmin} color="#cc0000" />
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Info</Text>
          <Text style={styles.text}>Local version: {localVersion ?? "unknown"}</Text>
          <Text style={styles.text}>Remote required version: {remoteVersion ?? "not set"}</Text>
          <Text style={styles.text}>Force update URL: {forceUpdateUrl ?? "not set"}</Text>
          <Text style={styles.text}>Firebase URL (config): {String(firebaseUrlFromConfig ?? "not configured")}</Text>
        </View>

        <View style={{ height: 24 }} />
        {busy && (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* Styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 48 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  card: {
    backgroundColor: "#fafafa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  h2: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  text: { fontSize: 14, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  row: { flexDirection: "row", alignItems: "center" },
  forceBox: {
    backgroundColor: "#fff4f4",
    borderColor: "#ffcccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  forceTitle: { color: "#a00", fontWeight: "700", marginBottom: 6 },
});
