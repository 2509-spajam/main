import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";

export default function Reward() {
  const router = useRouter();
  const scaleAnimation = useRef(new Animated.Value(0)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // コンペイトウのアニメーション
    Animated.parallel([
      Animated.spring(scaleAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();
  }, [scaleAnimation, rotateAnimation]);

  const handleBackToMap = () => {
    router.replace("/map" as any);
  };

  const rotateInterpolate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerText}>レビューを書いたら「コンペイトウ」ゲット！</Text>
      </View>

      {/* コンペイトウ表示 */}
      <View style={styles.rewardContainer}>
        <Text style={styles.congratsText}>コンペイトウ
GET！</Text>
        
        <Animated.View 
          style={[
            styles.compeitoContainer,
            {
              transform: [
                { scale: scaleAnimation },
                { rotate: rotateInterpolate }
              ]
            }
          ]}
        >
          <View style={styles.compeito}>
            <Text style={styles.compeitoText}>🍬</Text>
          </View>
        </Animated.View>

        <Text style={styles.getMessage}>あなたのレビューが
お店の発見につながりました！</Text>
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
  },
  compeito: {
    width: 120,
    height: 120,
    backgroundColor: colors.reward.gold,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  compeitoText: {
    fontSize: 60,
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
