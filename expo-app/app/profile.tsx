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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { useProfile } from "../hooks/useProfile";
import BottleDisplay3D from "../components/BottleDisplay3D";

export default function Profile() {
  const router = useRouter();
  const { profile, loading, refreshProfile } = useProfile();

  // デバッグ用：こんぺいとう50個追加
  const addDebugKompeito = async () => {
    try {
      const currentCount = await AsyncStorage.getItem('countConpeito');
      const newCount = (currentCount ? parseInt(currentCount, 10) : 0) + 50;
      await AsyncStorage.setItem('countConpeito', newCount.toString());
      
      // プロフィールを再読み込み
      refreshProfile();
      
      Alert.alert(
        '🍬 デバッグ', 
        `こんぺいとう50個追加しました！\n現在: ${newCount}個`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('デバッグボタンエラー:', error);
      Alert.alert('エラー', 'こんぺいとう追加に失敗しました');
    }
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

        {/* プロフィール情報 */}
        <View style={styles.profileSection}>
          <Image
            source={require("../assets/images/spa-nyan.png")}
            style={styles.profileAvatar}
            resizeMode="contain"
          />
          <Text style={styles.profileUsername}>{profile.username}</Text>
        </View>



        {/* 3D表示スペース */}
        <View style={styles.display3DContainer}>
          <View style={styles.bottle3D}>
            <BottleDisplay3D 
              style={styles.bottle3DInner} 
              compeitoCount={profile.totalKompeito}
            />
            <View style={styles.bottle3DOverlay}>
              <Text style={styles.bottleText}>
                獲得したコンペイトウ: {profile.totalKompeito}個
              </Text>
            </View>
          </View>
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

        {/* 余白 */}
        <View style={styles.bottomSpacing} />
        
        {/* デバッグボタン（右下の隅） */}
        {__DEV__ && (
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={addDebugKompeito}
            onLongPress={() => {
              Alert.alert(
                '🐛 デバッグモード', 
                'こんぺいとう50個追加ボタンです\n（開発版のみ表示）',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.debugButtonText}>+50🍬</Text>
          </TouchableOpacity>
        )}
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
  bottle3D: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    height: 250,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottle3DInner: {
    flex: 1,
  },
  bottle3DOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
  },
  bottleText: {
    ...typography.caption,
    color: colors.text.white,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 32,
  },
  debugButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    backgroundColor: colors.accent,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 999,
  },
  debugButtonText: {
    ...typography.caption,
    color: colors.text.white,
    fontWeight: 'bold',
    fontSize: 10,
  },
});
