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

function versionToNumber(v?: string | null): number {
  if (!v) return 0;
  const parts = v.split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts[0] * 1_000_000 + parts[1] * 1_000 + parts[2];
}

export default function App(): JSX.Element {
  const [initializing, setInitializing] = useState(true);
  const [localVersion, setLocalVersion] = useState<string | null>(null);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [forceUpdateUrl, setForceUpdateUrl] = useState<string | null>(null);
  const [forceRequired, setForceRequired] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);

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

  useEffect(() => {
    let versionListener: ReturnType<typeof createPollListener> | null = null;
    let urlListener: ReturnType<typeof createPollListener> | null = null;

    try {
      versionListener = createPollListener("current_version", 3000);
      urlListener = createPollListener("force_update_url", 3000);

      versionListener.start((data: any) => {
        const val = data ?? null;
        setRemoteVersion(val === null ? null : String(val));
      });

      urlListener.start((data: any) => {
        const val = data ?? null;
        setForceUpdateUrl(val === null ? null : String(val));
      });
    } catch (err) {
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
      try { versionListener && versionListener.stop(); } catch {}
      try { urlListener && urlListener.stop(); } catch {}
    };
  }, []);

  useEffect(() => {
    const r = versionToNumber(remoteVersion);
    const l = versionToNumber(localVersion);
    setForceRequired(r > l);
  }, [remoteVersion, localVersion]);

  const unlockAdmin = useCallback(async () => {
    setBusy(true);
    try {
      const remote = await fbGet("pin");
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
              <Text style={styles.text}>Status: Unlocked ✅</Text>
              <View style={styles.row}>
                <Button title="Test Admin Write" onPress={adminWriteDemo} disabled={busy} />
                <Button title="Lock Admin" onPress={lockAdmin} color="#d9534f" />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 20, textAlign: "center" },
  h2: { fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 10 },
  text: { fontSize: 14, color: "#aaa", marginBottom: 15 },
  input: { backgroundColor: "#222", color: "#fff", padding: 10, borderRadius: 5, marginBottom: 15, borderWidth: 1, borderColor: "#444" },
  card: { backgroundColor: "#1e1e1e", padding: 15, borderRadius: 8, marginBottom: 20 },
  forceBox: { backgroundColor: "#d9534f", padding: 15, borderRadius: 8, marginBottom: 20 },
  forceTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 5 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
});
  
