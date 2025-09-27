import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { useProfile } from "../hooks/useProfile";

export default function Profile() {
  const router = useRouter();
  const { profile, loading } = useProfile();



  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>プロフィール</Text>
        </View>

        {/* プロフィール情報 */}
        <View style={styles.profileSection}>
          <Image
            source={require("../assets/images/react-logo.png")}
            style={styles.profileAvatar}
            resizeMode="contain"
          />
          <Text style={styles.profileUsername}>{profile.username}</Text>
        </View>



        {/* 統計情報 */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>レビュー統計</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{profile.totalReviews}</Text>
              <Text style={styles.statLabel}>投稿レビュー数</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statNumber, styles.kompeito]}>
                {profile.totalKompeito}
              </Text>
              <Text style={styles.statLabel}>獲得コンペイトウ 🍬</Text>
            </View>
          </View>
        </View>

        {/* 3D表示スペース */}
        <View style={styles.display3DContainer}>
          <Text style={styles.sectionTitle}>コンペイトウコレクション</Text>
          <View style={styles.placeholder3D}>
            <Text style={styles.placeholderText}>3D表示予定</Text>
            <Text style={styles.placeholderSubText}>
              獲得したコンペイトウ: {profile.totalKompeito}個
            </Text>
          </View>
        </View>

        {/* 余白 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.primary,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    ...typography.button,
    color: colors.text.white,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.text.white,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    marginBottom: 12,
  },
  profileUsername: {
    ...typography.heading,
    color: colors.text.primary,
  },

  statsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    ...typography.subheading,
    color: colors.text.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    ...typography.heading,
    color: colors.primary,
    marginBottom: 4,
  },
  kompeito: {
    color: colors.accent,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: "center",
  },
  display3DContainer: {
    marginHorizontal: 20,
    marginTop: 32,
  },
  placeholder3D: {
    backgroundColor: colors.surface,
    padding: 40,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 200,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeholderText: {
    ...typography.subheading,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  placeholderSubText: {
    ...typography.caption,
    color: colors.text.light,
  },
  bottomSpacing: {
    height: 32,
  },
});
