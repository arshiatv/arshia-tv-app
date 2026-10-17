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
  TouchableOpacity,
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
  
  // شمارنده برای ۷ بار کلیک مخفی
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

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
    } finally {
      setInitializing(false);
    }

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

  // منطق کلیک روی لوگو
  const handleLogoPress = () => {
    const nextClicks = logoClicks + 1;
    if (nextClicks >= 7) {
      setLogoClicks(0);
      setShowAdminPanel(true);
      Alert.alert("منوی مخفی", "پنل مدیریت فعال شد.");
    } else {
      setLogoClicks(nextClicks);
    }
  };

  const unlockAdmin = useCallback(async () => {
    setBusy(true);
    try {
      const remote = await fbGet("pin");
      const remotePin = remote ?? null;
      if (!remotePin) {
        Alert.alert("خطا", "پین کدی در دیتابیس ست نشده است.");
        setBusy(false);
        return;
      }
      if (String(pinInput).trim() === String(remotePin).trim()) {
        setIsAdminUnlocked(true);
        setPinInput("");
        Alert.alert("موفقیت", "قفل مدیریت باز شد.");
      } else {
        Alert.alert("خطا", "پین کد اشتباه است.");
      }
    } catch (err: any) {
      Alert.alert("خطای شبکه", "اتصال به دیتابیس برقرار نشد. فیلترشکن خود را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }, [pinInput]);

  const lockAdmin = useCallback(() => {
    setIsAdminUnlocked(false);
    setShowAdminPanel(false);
  }, []);

  const adminWriteDemo = useCallback(async () => {
    if (!isAdminUnlocked) {
      Alert.alert("خطا", "ابتدا قفل پنل را باز کنید.");
      return;
    }
    setBusy(true);
    try {
      await fbSet("content/example_admin_entry", {
        updatedAt: Date.now(),
        note: "Written from app admin demo",
      });
      Alert.alert("موفقیت", "دیتا با موفقیت در فایربیس ثبت شد.");
    } catch (err: any) {
      Alert.alert("خطا در نوشتن", String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  }, [isAdminUnlocked]);

  const openUpdate = useCallback((url?: string | null) => {
    if (!url) {
      Alert.alert("خطا", "لینک آپدیت موجود نیست.");
      return;
    }
    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          Alert.alert("خطا", "امکان باز کردن لینک وجود ندارد.");
          return;
        }
        Linking.openURL(url).catch((e) => Alert.alert("خطا", String(e)));
      })
      .catch((e) => Alert.alert("خطا", String(e)));
  }, []);

  if (initializing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00ffff" />
          <Text style={styles.text}>در حال راه‌اندازی برنامه...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* لوگوی برنامه که قابلیت کلیک مخفی دارد */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleLogoPress} style={styles.logoContainer}>
          <Text style={styles.title}>Arshia TV</Text>
          <Text style={styles.subtitle}>خوش آمدید</Text>
        </TouchableOpacity>

        {forceRequired && (
          <View style={styles.forceBox}>
            <Text style={styles.forceTitle}>به‌روزرسانی اجباری</Text>
            <Text style={styles.text}>
              نسخه شما قدیمی است. لطفا برنامه را آپدیت کنید.
            </Text>
            <Button title="دانلود نسخه جدید" onPress={() => openUpdate(forceUpdateUrl)} color="#00ff00" />
          </View>
        )}

        {/* پنل مدیریت کاملا مخفی است و فقط بعد از ۷ بار کلیک روی لوگو ظاهر می‌شود */}
        {showAdminPanel && (
          <View style={styles.card}>
            <Text style={styles.h2}>ورود به پنل مدیریت</Text>
            {!isAdminUnlocked ? (
              <>
                <TextInput
                  placeholder="پین کد را وارد کنید"
                  placeholderTextColor="#666"
                  value={pinInput}
                  onChangeText={setPinInput}
                  style={styles.input}
                  keyboardType="number-pad"
                  editable={!busy}
                />
                <View style={styles.row}>
                  <Button title="تایید و باز کردن" onPress={unlockAdmin} disabled={busy || !pinInput.trim()} />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.text}>وضعیت مدیریت: متصل و باز ✅</Text>
                <View style={styles.row}>
                  <Button title="تست نوشتن دیتابیس" onPress={adminWriteDemo} disabled={busy} />
                  <Button title="قفل کردن مجدد" onPress={lockAdmin} color="#d9534f" />
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E17" },
  content: { padding: 20, alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A0E17" },
  logoContainer: { padding: 40, alignItems: "center", marginVertical: 40 },
  title: { fontSize: 36, fontWeight: "bold", color: "#00ffff", textAlign: "center" },
  subtitle: { fontSize: 16, color: "#aaa", marginTop: 10 },
  h2: { fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 15, textAlign: "right", width: "100%" },
  text: { fontSize: 14, color: "#aaa", marginBottom: 15, textAlign: "center" },
  input: { backgroundColor: "#1a1a2e", color: "#fff", padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: "#00ffff", width: 250, textAlign: "center" },
  card: { backgroundColor: "#151a30", padding: 20, borderRadius: 12, marginBottom: 20, width: "100%", border豎Width: 1, borderColor: "#333" },
  forceBox: { backgroundColor: "#d9534f", padding: 15, borderRadius: 8, marginBottom: 20, width: "100%" },
  forceTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 5, textAlign: "right" },
  row: { flexDirection: "row", justifyContent: "space-around", marginTop: 5, width: "100%" },
});
