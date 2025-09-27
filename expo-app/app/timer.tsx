import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  AppStateStatus,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage"; // AsyncStorageのインポート
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { getCurrentStore } from "../data/mockStores";

// 必要な定数
const TOTAL_TIME_SECONDS = 10 * 60; // 10分 = 600秒
const STORAGE_KEY_START_TIME = "@timer_start_time";
const STORAGE_KEY_TIMER_SESSION = "@timer_session_id"; // セッション管理用

// 秒数をMM:SS形式にフォーマットするヘルパー関数
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.floor(Math.max(0, totalSeconds) % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export default function Timer() {
  const router = useRouter();
  const store = getCurrentStore();

  // 状態管理
  const [remainingTime, setRemainingTime] = useState(TOTAL_TIME_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // タイマーの参照
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  // タイマーのリセット
  const resetTimer = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setIsTimeUp(false);
    setRemainingTime(TOTAL_TIME_SECONDS);
    setCurrentSessionId(null);
    await AsyncStorage.multiRemove([
      STORAGE_KEY_START_TIME,
      STORAGE_KEY_TIMER_SESSION,
    ]);
  }, []);

  // 新しいセッションを開始
  const startNewSession = useCallback(async () => {
    const sessionId = Date.now().toString();
    setCurrentSessionId(sessionId);
    await AsyncStorage.setItem(STORAGE_KEY_TIMER_SESSION, sessionId);
    return sessionId;
  }, []);

  // 時間経過を計算する関数
  const calculateElapsedTime = useCallback(async () => {
    const storedStartTime = await AsyncStorage.getItem(STORAGE_KEY_START_TIME);
    if (storedStartTime) {
      const startTime = new Date(storedStartTime).getTime();
      const currentTime = Date.now();
      const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
      return elapsedSeconds;
    }
    return 0;
  }, []);

  // タイマーを開始/再開する関数
  const startTimer = useCallback(
    async (
      initialStartTime: number | null = null,
      sessionId: string | null = null
    ) => {
      const startTime = initialStartTime ?? Date.now();
      const activeSessionId = sessionId ?? (await startNewSession());

      await AsyncStorage.setItem(
        STORAGE_KEY_START_TIME,
        new Date(startTime).toISOString()
      );

      setIsRunning(true);
      setIsTimeUp(false);
      setCurrentSessionId(activeSessionId);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(async () => {
        const elapsed = await calculateElapsedTime();
        const newRemainingTime = TOTAL_TIME_SECONDS - elapsed;

        if (newRemainingTime <= 0) {
          setRemainingTime(0);
          setIsTimeUp(true);
          setIsRunning(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          await AsyncStorage.removeItem(STORAGE_KEY_START_TIME);
        } else {
          setRemainingTime(newRemainingTime);
        }
      }, 1000); // 1秒ごとに更新
    },
    [calculateElapsedTime, startNewSession]
  );

  // アプリの状態が変更されたときのハンドラ
  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // アプリがフォアグラウンドに戻ったとき
        const elapsed = await calculateElapsedTime();
        const newRemainingTime = TOTAL_TIME_SECONDS - elapsed;

        // バックグラウンドでの経過時間を反映
        setRemainingTime(Math.max(0, newRemainingTime));

        if (newRemainingTime > 0) {
          // タイマーがまだ残っている場合は再開
          const storedStartTime = await AsyncStorage.getItem(
            STORAGE_KEY_START_TIME
          );
          const storedSessionId = await AsyncStorage.getItem(
            STORAGE_KEY_TIMER_SESSION
          );
          if (storedStartTime && storedSessionId === currentSessionId) {
            // アプリがアクティブな状態に戻ったときに、タイマーを再開させる
            // 既にisRunningがtrueの場合は、startTimer内で既存のintervalがクリアされるため問題ない
            startTimer(new Date(storedStartTime).getTime(), storedSessionId);
          }
        } else if (newRemainingTime <= 0 && isRunning) {
          // バックグラウンドで時間が経過していた場合
          setRemainingTime(0);
          setIsTimeUp(true);
          setIsRunning(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          await AsyncStorage.removeItem(STORAGE_KEY_START_TIME);
        }
      } else if (nextAppState === "background" || nextAppState === "inactive") {
        // アプリがバックグラウンドに移行したとき
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        // バックグラウンドでも経過時間は AsyncStorage に保存された開始時刻から計算されるため、
        // isRunning が true であれば、特に何もしなくてもバックグラウンドでの時間は考慮される
      }
      appState.current = nextAppState;
    },
    [isRunning, calculateElapsedTime, startTimer, currentSessionId]
  );

  // 画面がフォーカスされた時の処理（画面に戻った時）
  useFocusEffect(
    useCallback(() => {
      const checkAndResetIfNeeded = async () => {
        const storedSessionId = await AsyncStorage.getItem(
          STORAGE_KEY_TIMER_SESSION
        );
        const storedStartTime = await AsyncStorage.getItem(
          STORAGE_KEY_START_TIME
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
            const newRemainingTime = TOTAL_TIME_SECONDS - elapsed;

            if (newRemainingTime > 0) {
              setRemainingTime(newRemainingTime);
              if (!isRunning) {
                startTimer(
                  new Date(storedStartTime).getTime(),
                  storedSessionId
                );
              }
            } else {
              setRemainingTime(0);
              setIsTimeUp(true);
              setIsRunning(false);
              await AsyncStorage.multiRemove([
                STORAGE_KEY_START_TIME,
                STORAGE_KEY_TIMER_SESSION,
              ]);
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
    // スタートボタンのためにflexを大きく使う
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
