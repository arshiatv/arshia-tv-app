import React from "react";
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { useRealtimeList } from "../hooks/useRealtimeList";
import auth from "@react-native-firebase/auth";
import AuthGate from "../components/AuthGate";
import { useNavigation } from "@react-navigation/native";

/**
 * SeriesPage: real-time subscription to /content/persian/series
 * Strict auth gate applied; double-check on open.
 */

export default function SeriesPage() {
  const { data: seriesList, loading, error } = useRealtimeList("/content/persian/series");
  const user = auth().currentUser;
  const navigation = useNavigation();

  if (!user) {
    return <AuthGate message="برای مشاهده و پخش سریال‌ها باید وارد حساب کاربری شوید." />;
  }

  const onOpen = (item: any) => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      Alert.alert("ورود اجباری", "برای مشاهده ابتدا وارد شوید.");
      navigation.navigate("Login" as never);
      return;
    }
    navigation.navigate("SeriesDetail" as never, { series: item } as never);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!seriesList || seriesList.length === 0) return <View style={styles.center}><Text>موردی یافت نشد.</Text></View>;

  return (
    <View style={{ flex: 1 }}>
      <FlatList data={seriesList} keyExtractor={(i) => i.id ?? i.title} contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => onOpen(item)}>
            {item.poster && <Image source={{ uri: item.poster }} style={styles.poster} />}
            <View style={styles.info}>
              <Text style={styles.title}>{item.title}</Text>
              <Text numberOfLines={2} style={styles.desc}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        )} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  item: { flexDirection: "row", marginBottom: 12, backgroundColor: "#f8f8f8", borderRadius: 8, overflow: "hidden" },
  poster: { width: 110, height: 70, resizeMode: "cover" },
  info: { flex: 1, padding: 10 },
  title: { fontWeight: "700", fontSize: 16 },
  desc: { color: "#666", marginTop: 4 },
});
