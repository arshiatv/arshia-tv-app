import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from "react-native";
import auth from "@react-native-firebase/auth";
import { useNavigation } from "@react-navigation/native";

/**
 * Full-screen, non-dismissible Auth gate.
 * Blocks interaction until user is authenticated.
 * Navigates to Login/Signup screens (adjust names if needed).
 */

export default function AuthGate({ message }: { message?: string }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigation = useNavigation();

  useEffect(() => {
    const onBack = () => true;
    BackHandler.addEventListener("hardwareBackPress", onBack);

    const unsub = auth().onAuthStateChanged((u) => {
      setUser(u);
      setInitializing(false);
    });

    return () => {
      BackHandler.removeEventListener("hardwareBackPress", onBack);
      unsub();
    };
  }, []);

  if (initializing) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>لطفا صبر کنید …</Text>
      </View>
    );
  }

  if (user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>ورود یا ثبت‌نام الزامی</Text>
        <Text style={styles.message}>
          {message ?? "برای مشاهده و پخش فیلم‌ها و سریال‌ها باید وارد حساب کاربری شوید."}
        </Text>

        <TouchableOpacity style={[styles.button, { backgroundColor: "#1976D2" }]} onPress={() => navigation.navigate("Login" as never)}>
          <Text style={styles.buttonText}>ورود</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { backgroundColor: "#43A047" }]} onPress={() => navigation.navigate("Signup" as never)}>
          <Text style={styles.buttonText}>ثبت‌نام</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000000cc", justifyContent: "center", alignItems: "center", zIndex: 9999 },
  card: { width: "92%", backgroundColor: "#fff", borderRadius: 10, padding: 20, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  message: { fontSize: 15, color: "#333", textAlign: "center", marginBottom: 16 },
  button: { width: "100%", paddingVertical: 12, marginVertical: 6, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
