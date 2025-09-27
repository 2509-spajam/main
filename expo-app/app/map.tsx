import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Map() {
  const router = useRouter();

  const handleEnterStore = () => {
    router.push("/timer" as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>未評価レビュワーズ</Text>
        </View>

        {/* 地図表示エリア */}
        <View style={styles.mapContainer}>
          <Text style={styles.mapPlaceholder}>Map View (モック)</Text>
        </View>

        {/* 下部ボタン */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.enterButton}
            onPress={handleEnterStore}
          >
            <Text style={styles.enterButtonText}>お店に入る</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.text.white,
    textAlign: "center",
  },
  mapContainer: {
    flex: 1,
    backgroundColor: colors.map.water,
    justifyContent: "center",
    alignItems: "center",
  },
  mapPlaceholder: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: "center",
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: colors.background,
  },
  enterButton: {
    backgroundColor: colors.button.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: "center",
  },
  enterButtonText: {
    ...typography.button,
    color: colors.text.white,
  },
});
