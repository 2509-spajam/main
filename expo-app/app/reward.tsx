import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import CompeitoJar from "../components/CompeitoJar";
import { getUserData } from "../data/mockStores";

export default function Reward() {
  const router = useRouter();
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const userData = getUserData();
  const totalCompeitos = 5;

  useEffect(() => {
    console.log('🏆 Reward screen loaded');
    
    // フェードインアニメーション
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnimation]);

  const handleBackToMap = () => {
    router.replace("/map" as any);
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          レビューを書いたら「コンペイトウ」ゲット！
        </Text>
      </View>

      {/* コンペイトウ表示 */}
      <View style={styles.rewardContainer}>
        <Animated.View style={{ opacity: fadeAnimation }}>
          <Text style={styles.congratsText}>コンペイトウ{"\n"}GET！</Text>
        </Animated.View>
        
        {/* 3Dこんぺいとうビン表示 */}
        <CompeitoJar 
          count={totalCompeitos} 
          size="medium" 
          animated={true} 
          style={styles.compeitoContainer}
          showCount={true}
        />

        <Animated.View style={{ opacity: fadeAnimation }}>
          <Text style={styles.getMessage}>あなたのレビューが{"\n"}お店の発見につながりました！</Text>
        </Animated.View>
      </View>

      {/* 戻るボタン */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToMap}>
          <Text style={styles.backButtonText}>もどる</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.reward.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerText: {
    ...typography.body,
    color: colors.text.primary,
    textAlign: "center",
    lineHeight: 20,
  },
  rewardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  congratsText: {
    ...typography.title,
    color: colors.primary,
    textAlign: "center",
    marginBottom: 40,
  },
  compeitoContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  bottomContainer: {
    padding: 20,
  },
  backButton: {
    backgroundColor: colors.button.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: "center",
  },
  backButtonText: {
    ...typography.button,
    color: colors.text.white,
  },
});
