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

// Use the project's lightweight Firebase helper (REST-based).
// Path matches services/firebase.ts in this repo.
import { fbGet, fbSet, createPollListener } from "services/firebase";

type Maybe<T> = T | null;

function versionToNumber(v?: Maybe<string>): number {
  if (!v) return 0;
  const parts = v.split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts[0] * 1_000_000 + parts[1] * 1_000 + parts[2];
}

export default function App(): JSX.Element {
  const [initializing, setInitializing] = useState<boolean>(true);

  // Versions & force-update
  const [localVersion, setLocalVersion] = useState<Maybe<string>>(null);
  const [remoteVersion, setRemoteVersion] = useState<Maybe<string>>(null);
  const [forceUpdateUrl, setForceUpdateUrl] = useState<Maybe<string>>(null);
  const [forceRequired, setForceRequired] = useState<boolean>(false);

  // Admin/PIN state
  const [pinInput, setPinInput] = useState<string>("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);

  // Simple auth placeholders (no SDK present in repo)
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [userId, setUserId] = useState<Maybe<string>>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // mirrors isAdminUnlocked

  const [busy, setBusy] = useState<boolean>(false);

  // Read app version on mount (Expo-friendly fallback)
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

  // Poll /current_version and /force_update_url using project's createPollListener
  useEffect(() => {
    let versionListener = createPollListener("current_version", 3000);
    let urlListener = createPollListener("force_update_url", 3000);
    let started = false;

    try {
      versionListener.start((data: any) => {
        setRemoteVersion(data == null ? null : String(data));
      });
      urlListener.start((data: any) => {
        setForceUpdateUrl(data == null ? null : String(data));
      });
      started = true;
    } catch (err) {
      // Fallback: poll manually if createPollListener not available
      const id = setInterval(async () => {
        try {
          const rv = await fbGet("current_version");
          setRemoteVersion(rv == null ? null : String(rv));
          const ru = await fbGet("force_update_url");
          setForceUpdateUrl(ru == null ? null : String(ru));
        } catch {
          // ignore network errors
        }
      }, 5000);
      return () => clearInterval(id);
    }

    setInitializing(false);
    return () => {
      try {
        if (started) {
          versionListener.stop();
          urlListener.stop();
        }
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setIsAdmin(isAdminUnlocked);
  }, [isAdminUnlocked]);

  // Evaluate forceRequired
  useEffect(() => {
    const r = versionToNumber(remoteVersion ?? undefined);
    const l = versionToNumber(localVersion ?? undefined);
    setForceRequired(r > l);
  }, [remoteVersion, localVersion]);

  // Admin unlock: compare with /pin root value
  const unlockAdmin = useCallback(async () => {
    setBusy(true);
    try {
      const remotePin = await fbGet("pin");
      if (!remotePin) {
        Alert.alert("No PIN set", "Admin PIN is not configured in remote database.");
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

  // Admin write demo using fbSet
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

  // Sign-in placeholders (repo uses REST helpers, no auth SDK).
  const signInWithEmail = useCallback(async () => {
    Alert.alert(
      "Not configured",
      "Email/password sign-in is not configured in this project. Use admin PIN or integrate Firebase Auth."
    );
  }, []);

  const signInAnon = useCallback(async () => {
    Alert.alert("Not configured", "Anonymous sign-in is not available in this build.");
  }, []);

  const signOut = useCallback(async () => {
    Alert.alert("Not configured", "Sign-out is not configured in this build.");
  }, []);

  // getStreamToken fallback: call HTTP endpoint if provided in expo config
  const callGetStreamToken = useCallback(async () => {
    setBusy(true);
    try {
      const fnUrl =
        (Constants?.manifest?.extra && (Constants.manifest.extra as any).streamFunctionUrl) ||
        (Constants?.expoConfig?.extra && (Constants.expoConfig!.extra as any).streamFunctionUrl) ||
        null;
      if (!fnUrl) {
        Alert.alert("Not configured", "Stream token function URL not configured in app config.");
        return;
      }
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: "demo" }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Function error ${res.status}: ${text}`);
      }
      const json = await res.json();
      Alert.alert("Token result", JSON.stringify(json));
    } catch (err: any) {
      Alert.alert("Function error", String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  }, []);

  const openUpdate = useCallback((url?: Maybe<string>) => {
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
            This uses the PIN stored at the database path "/pin" (root). AdminPage expects the same.
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
          <Text style={styles.h2}>Authentication (placeholder)</Text>
          <Text style={styles.textSmall}>Auth SDK is not configured — these are placeholders</Text>

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
            <Button title="Sign in (email)" onPress={signInWithEmail} />
            <View style={{ width: 10 }} />
            <Button title="Sign in (anon)" onPress={signInAnon} />
          </View>
          <View style={{ height: 8 }} />
          <Button title="Sign out" onPress={signOut} color="#cc0000" />
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Admin / Functions</Text>
          <Text style={styles.textSmall}>
            Admin actions operate via Realtime DB REST. For getStreamToken, configure streamFunctionUrl in expo config
            (extra.streamFunctionUrl).
          </Text>
          <View style={styles.row}>
            <Button title="Admin write" onPress={adminWriteDemo} disabled={!isAdmin || busy} />
            <View style={{ width: 10 }} />
            <Button title="Call getStreamToken" onPress={callGetStreamToken} disabled={busy} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Debug Info</Text>
          <Text style={styles.textSmall}>Local version: {localVersion ?? "unknown"}</Text>
          <Text style={styles.textSmall}>Remote version: {remoteVersion ?? "not set"}</Text>
          <Text style={styles.textSmall}>Force URL: {forceUpdateUrl ?? "none"}</Text>
          <Text style={styles.textSmall}>Admin unlocked: {isAdminUnlocked ? "yes" : "no"}</Text>
        </View>

        <View style={{ height: 20 }} />
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
  textSmall: { fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 10, borderRadius: 6, marginBottom: 8 },
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
