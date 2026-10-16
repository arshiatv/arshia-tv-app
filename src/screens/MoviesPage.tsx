import React from "react";
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { useRealtimeList } from "../hooks/useRealtimeList";
import auth from "@react-native-firebase/auth";
import AuthGate from "../components/AuthGate";
import { useNavigation } from "@react-navigation/native";

/**
 * MoviesPage: real-time subscription to /content/persian/movies
 * Strict auth gate applied. Double-checks auth on item press.
 */

export default function MoviesPage() {
  const { data: movies, loading, error } = useRealtimeList("/content/persian/movies");
  const user = auth().currentUser;
  const navigation = useNavigation();

  if (!user) {
    return <AuthGate message="برای دسترسی به فیلم‌ها باید وارد حساب کاربری شوید." />;
  }

  const onPlay = (item: any) => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      Alert.alert("ورود اجباری", "برای پخش لطفا وارد شوید.");
      navigation.navigate("Login" as never);
      return;
    }
    navigation.navigate("MoviePlayer" as never, { movie: item } as never);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.item} onPress={() => onPlay(item)}>
      {item.poster ? <Image source={{ uri: item.poster }} style={styles.poster} /> : null}
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text numberOfLines={2} style={styles.desc}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!movies || movies.length === 0) return <View style={styles.center}><Text>موردی یافت نشد.</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <FlatList data={movies} keyExtractor={(i) => i.id ?? i.title} renderItem={renderItem} contentContainerStyle={{ padding: 12 }} />
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
