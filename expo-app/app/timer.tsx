import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { getCurrentStore } from "../data/mockStores";
import { useTimer, TIMER_STORAGE_KEYS } from "../hooks/useTimer";

export default function Timer() {
  const router = useRouter();
  const store = getCurrentStore();

  // useTimerフックを使用
  const {
    remainingTime,
    isRunning,
    isTimeUp,
    currentSessionId,
    startTimer,
    resetTimer,
    formatTime,
    calculateElapsedTime,
    handleAppStateChange,
  } = useTimer();

  // 画面がフォーカスされた時の処理（画面に戻った時）
  useFocusEffect(
    useCallback(() => {
      const checkAndResetIfNeeded = async () => {
        const storedSessionId = await AsyncStorage.getItem(
          TIMER_STORAGE_KEYS.SESSION
        );
        const storedStartTime = await AsyncStorage.getItem(
          TIMER_STORAGE_KEYS.START_TIME
        );

        // 既存のセッションがある場合
        if (storedSessionId && storedStartTime) {
          // 現在のセッションIDと異なる場合、または初回アクセスの場合はリセット
          if (currentSessionId === null) {
            // 画面に初めて入った時、前回のデータがある場合はリセット
            await resetTimer();
            // リセット後、自動的にタイマーを開始
            await startTimer();
          } else if (storedSessionId !== currentSessionId) {
            // 異なるセッションの場合はリセット
            await resetTimer();
            // リセット後、自動的にタイマーを開始
            await startTimer();
          } else {
            // 同じセッションの場合は継続（バックグラウンドから復帰等）
            const elapsed = await calculateElapsedTime();
            const newRemainingTime = 10 * 60 - elapsed; // TOTAL_TIME_SECONDS

            if (newRemainingTime > 0) {
              if (!isRunning) {
                startTimer(
                  new Date(storedStartTime).getTime(),
                  storedSessionId
                );
              }
            }
          }
        } else {
          // 初回訪問時（ストレージにデータがない場合）
          // 自動的にタイマーを開始
          await startTimer();
        }
      };

      checkAndResetIfNeeded();

      // クリーンアップ関数（画面から離れる時）
      return () => {
        // 必要に応じてクリーンアップ処理
      };
    }, [
      currentSessionId,
      isRunning,
      calculateElapsedTime,
      startTimer,
      resetTimer,
    ])
  );

  // AppStateのリスナー設定
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  // handleStartTimer関数は削除 - 自動開始になったため

  const handleExitStore = async () => {
    await resetTimer(); // タイマー状態をクリア
    router.push("/review" as any);
  };

  const timerText = formatTime(remainingTime);

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerText}>滞在チェック...</Text>
      </View>

      <View style={styles.timerContainer}>
        {/* タイマー表示 */}
        <Text style={styles.timerText}>{timerText}</Text>

        {/* タイマー実行中の表示 */}
        {isRunning && !isTimeUp && (
          <Text style={styles.runningText}>⏱️ タイマー実行中...</Text>
        )}

        {/* タイムアップ表示 */}
        {isTimeUp && <Text style={styles.timeUpText}>⏰ タイムアップ！</Text>}
      </View>

      {/* --- 店舗情報 --- */}
      <View style={styles.storeInfoContainer}>
        <View style={styles.storeIcon}>
          <Text style={styles.storeIconText}>🏪</Text>
        </View>
        <Text style={styles.storeName}>{store.name}</Text>
      </View>

      {/* --- 退店ボタン --- */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.exitButton,
            !isTimeUp && styles.exitButtonDisabled, // 10分未満は無効なスタイルを適用
          ]}
          onPress={handleExitStore}
          disabled={!isTimeUp} // 10分経過後にのみ有効化
        >
          <Text style={styles.exitButtonText}>お店を出る (レビュー書く!)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 既存のスタイル
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
    marginBottom: 20,
  },
  runningText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 16,
    textAlign: "center",
  },
  timeUpText: {
    ...typography.heading,
    color: colors.text.danger, // タイムアップを強調
    marginTop: 20,
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
  exitButtonDisabled: {
    backgroundColor: colors.button.disabled, // 無効時の色
    opacity: 0.6,
  },
  exitButtonText: {
    ...typography.button,
    color: colors.text.white,
    textAlign: "center",
  },
});
