import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { getCurrentStore } from "../data/mockStores";
import { SafeAreaView } from "react-native-safe-area-context"; 

export default function Timer() {
  const router = useRouter();
  const store = getCurrentStore();

  const handleExitStore = () => {
    router.push("/review" as any);
  };

  return (
    <SafeAreaView style={styles.container}>
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerText}>滞在チェック...</Text>
      </View>

      {/* タイマー表示 */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>00:00</Text>
      </View>

      {/* 店舗情報 */}
      <View style={styles.storeInfoContainer}>
        <View style={styles.storeIcon}>
          <Text style={styles.storeIconText}>🏪</Text>
        </View>
        <Text style={styles.storeName}>{store.name}</Text>
      </View>

      {/* 退店ボタン */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.exitButton} onPress={handleExitStore}>
          <Text style={styles.exitButtonText}>お店を出る
(レビュー書く!)</Text>
        </TouchableOpacity>
      </View>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.timer.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerText: {
    ...typography.subheading,
    color: colors.text.primary,
    textAlign: "center",
  },
  timerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  timerText: {
    ...typography.timer,
    color: colors.text.primary,
  },
  storeInfoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  storeIcon: {
    width: 80,
    height: 80,
    backgroundColor: colors.surface,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  storeIconText: {
    fontSize: 40,
  },
  storeName: {
    ...typography.subheading,
    color: colors.text.primary,
  },
  bottomContainer: {
    padding: 20,
  },
  exitButton: {
    backgroundColor: colors.button.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: "center",
  },
  exitButtonText: {
    ...typography.button,
    color: colors.text.white,
    textAlign: "center",
  },
});
