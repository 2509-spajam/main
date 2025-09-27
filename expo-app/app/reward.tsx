import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import GLBCompeitoSingle from '../components/GLBCompeitoSingle';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import GLBCompeitoJar from "../components/GLBCompeitoJar";

export default function Reward() {
  const router = useRouter();
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const [compeitoCount, setCompeitoCount] = useState<number>(1);

  // コンペイトウ数をlocalStorageから取得・更新
  const updateCompeitoCount = async () => {
    try {
      const storedCount = await AsyncStorage.getItem('countConpeito');
      let currentCount = 1;
      
      if (storedCount !== null) {
        currentCount = parseInt(storedCount, 10) + 1;
      }
      
      await AsyncStorage.setItem('countConpeito', currentCount.toString());
      setCompeitoCount(currentCount);
      console.log(`🍬 コンペイトウ数更新: ${currentCount}`);
    } catch (error) {
      console.error('❌ localStorage操作エラー:', error);
      setCompeitoCount(1);
    }
  };

  useEffect(() => {
    console.log("🏆 Reward screen loaded");
    
    // コンペイトウ数を更新
    updateCompeitoCount();

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
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
      {/* コンペイトウ表示 */}
      <View style={styles.rewardContainer}>
        <Animated.View style={{ opacity: fadeAnimation }}>
          <Text style={styles.congratsText}>コンペイトウ{"\n"}GET！</Text>
        </Animated.View>
        
        {/* 3Dこんぺいとう単体表示 */}
        <GLBCompeitoSingle
          size={0.6}
          rotationSpeed={0.015}
        />
        
        <Animated.View style={{ opacity: fadeAnimation }}>
          <Text style={styles.countMessage}>現在のコンペイトウ数：{compeitoCount}</Text>
        </Animated.View>
      </View>

        {/* 戻るボタン */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToMap}>
            <Text style={styles.backButtonText}>もどる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    ...typography.body,
    color: colors.text.primary,
    textAlign: "center",
    lineHeight: 20,
    flex: 1,
  },
  profileButton: {
    position: "absolute",
    right: 20,
    top: 60,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileIconText: {
    fontSize: 18,
    color: colors.text.primary,
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
    alignItems: "center",
    justifyContent: "center",
  },
  countMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 20,
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
