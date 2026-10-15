import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Linking, BackHandler, Platform } from "react-native";
import database from "@react-native-firebase/database";
import DeviceInfo from "react-native-device-info";
import semver from "semver";

/**
 * Force Update at app root (strict):
 * - Reads /current_version and /force_update_url from Realtime DB
 * - If localVersion < current_version OR remote can't be read (strict mode),
 *   block the app with a non-dismissible full-screen update screen.
 *
 * Place this component at the root of your app (before NavigationContainer)
 */

const ForceUpdateScreen: React.FC<{ url: string; message?: string }> = ({ url, message }) => {
  // Block Android back
  useEffect(() => {
    const onBack = () => true;
    BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => BackHandler.removeEventListener("hardwareBackPress", onBack);
  }, []);

  const openUrl = async () => {
    try {
      if (url) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      }
      // fallback
      const fallback = Platform.OS === "android" ? "https://play.google.com/store" : "https://apps.apple.com/";
      await Linking.openURL(fallback);
    } catch (e) {
      console.warn("Open URL failed", e);
    }
  };

  return (
    <SafeAreaView style={styles.forceContainer}>
      <View style={styles.card}>
        <Text style={styles.title}>از کار افتادن نسخه قبلی</Text>
        <Text style={styles.message}>
          {message ??
            "نسخهٔ فعلی برنامه دیگر پشتیبانی نمی‌شود. برای ادامه باید برنامه را فوراً به‌روز کنید."}
        </Text>
        <TouchableOpacity style={styles.button} onPress={openUrl} accessibilityLabel="Update Now">
          <Text style={styles.buttonText}>Update Now</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>برای ادامه باید به اینترنت متصل شده و برنامه را آپدیت کنید.</Text>
      </View>
    </SafeAreaView>
  );
};

export default function AppRoot({ children }: { children: React.ReactNode }) {
  const [forceUpdateRequired, setForceUpdateRequired] = useState<boolean>(false);
  const [updateUrl, setUpdateUrl] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    const localVersion = DeviceInfo.getVersion(); // ex: "1.2.3"
    const currentVersionRef = database().ref("/current_version");
    const urlRef = database().ref("/force_update_url");

    // Strict behavior: if we cannot determine remote required version (error or no value),
    // we will consider force update required (to prevent bypass).
    const handleErrorStrict = (err?: any) => {
      console.warn("Force update check error:", err);
      if (!mounted) return;
      setForceUpdateRequired(true);
      setChecked(true);
    };

    const checkOnce = async () => {
      try {
        const snap = await currentVersionRef.once("value");
        if (!mounted) return;
        if (!snap.exists()) {
          // no version defined => strict block (change if you want permissive)
          handleErrorStrict();
          return;
        }
        const requiredVersion = snap.val();
        // read url
        const urlSnap = await urlRef.once("value");
        const urlVal = urlSnap.exists() ? urlSnap.val() : null;
        setUpdateUrl(urlVal);

        // normalize values using semver.coerce
        const lv = semver.coerce(localVersion)?.version ?? localVersion;
        const rv = semver.coerce(requiredVersion)?.version ?? requiredVersion;

        if (semver.valid(lv) && semver.valid(rv)) {
          if (semver.lt(lv, rv)) {
            setForceUpdateRequired(true);
          } else {
            setForceUpdateRequired(false);
          }
          setChecked(true);
        } else {
          // If semver couldn't parse, fall back to string compare logic
          if (lv < rv) setForceUpdateRequired(true);
          else setForceUpdateRequired(false);
          setChecked(true);
        }
      } catch (e) {
        handleErrorStrict(e);
      }
    };

    // subscribe to changes (keeps real-time)
    const onValue = (snap: any) => {
      try {
        if (!mounted) return;
        const requiredVersion = snap.exists() ? snap.val() : null;
        if (!requiredVersion) {
          setForceUpdateRequired(true);
          setChecked(true);
          return;
        }
        const lv = semver.coerce(localVersion)?.version ?? localVersion;
        const rv = semver.coerce(requiredVersion)?.version ?? requiredVersion;
        if (semver.valid(lv) && semver.valid(rv)) {
          setForceUpdateRequired(semver.lt(lv, rv));
        } else {
          setForceUpdateRequired(lv < rv);
        }
        setChecked(true);
      } catch (e) {
        console.warn(e);
        setForceUpdateRequired(true);
        setChecked(true);
      }
    };

    checkOnce();
    currentVersionRef.on("value", onValue);
    const urlListener = (snap: any) => {
      if (!mounted) return;
      if (snap.exists()) setUpdateUrl(snap.val());
    };
    urlRef.on("value", urlListener);

    return () => {
      mounted = false;
      currentVersionRef.off("value", onValue);
      urlRef.off("value", urlListener);
    };
  }, []);

  // while checking, you can show splash or block - we choose to block until resolved
  if (!checked || forceUpdateRequired) {
    return <ForceUpdateScreen url={updateUrl ?? ""} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  forceContainer: {
    flex: 1,
    backgroundColor: "#0b0b0b",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "92%",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  message: { fontSize: 16, textAlign: "center", marginBottom: 20, color: "#333" },
  button: {
    backgroundColor: "#E53935",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  hint: { fontSize: 12, color: "#666", marginTop: 8, textAlign: "center" },
});
