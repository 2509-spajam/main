import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { useProfile } from "../hooks/useProfile";

export default function Profile() {
  const router = useRouter();
  const { profile, loading, resetStats } = useProfile();

  const handleResetStats = () => {
    Alert.alert(
      "統計データのリセット",
      "すべての統計データをリセットしますか？この操作は取り消せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "リセット",
          style: "destructive",
          onPress: resetStats,
        },
      ]
    );
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月から参加`;
  };

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

        {/* ユーザー基本情報 */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={require("../assets/images/react-logo.png")}
              style={styles.avatar}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.username}>{profile.username}</Text>
          <Text style={styles.joinDate}>
            {formatJoinDate(profile.joinDate)}
          </Text>
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

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{profile.reviewedStores}</Text>
              <Text style={styles.statLabel}>レビューした店舗数</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{profile.monthlyReviews}</Text>
              <Text style={styles.statLabel}>今月のレビュー数</Text>
            </View>
          </View>
        </View>

        {/* 設定・その他 */}
        <View style={styles.settingsContainer}>
          <Text style={styles.sectionTitle}>設定</Text>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>通知設定</Text>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>ヘルプ・サポート</Text>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleResetStats}
          >
            <Text style={[styles.settingText, styles.dangerText]}>
              統計データをリセット
            </Text>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
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
  profileCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
  },
  username: {
    ...typography.heading,
    color: colors.text.primary,
    marginBottom: 8,
  },
  joinDate: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  statsContainer: {
    marginHorizontal: 20,
    marginTop: 24,
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
  settingsContainer: {
    marginHorizontal: 20,
    marginTop: 32,
  },
  settingItem: {
    backgroundColor: colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
  },
  settingText: {
    ...typography.body,
    color: colors.text.primary,
  },
  dangerText: {
    color: colors.text.danger,
  },
  settingArrow: {
    ...typography.body,
    color: colors.text.light,
  },
  bottomSpacing: {
    height: 32,
  },
});
