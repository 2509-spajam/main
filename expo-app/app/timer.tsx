import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, AppState, AppStateStatus } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage"; // AsyncStorageのインポート
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { getCurrentStore } from "../data/mockStores";

// 必要な定数
const TOTAL_TIME_SECONDS = 10 * 60; // 10分 = 600秒
const STORAGE_KEY_START_TIME = "@timer_start_time";

// 秒数をMM:SS形式にフォーマットするヘルパー関数
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.floor(Math.max(0, totalSeconds) % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function Timer() {
  const router = useRouter();
  const store = getCurrentStore();

  // 状態管理
  const [remainingTime, setRemainingTime] = useState(TOTAL_TIME_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // タイマーの参照
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  // タイマーのリセット
  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setIsTimeUp(false);
    setRemainingTime(TOTAL_TIME_SECONDS);
    AsyncStorage.removeItem(STORAGE_KEY_START_TIME);
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
  const startTimer = useCallback(async (initialStartTime: number | null = null) => {
    const startTime = initialStartTime ?? Date.now();
    await AsyncStorage.setItem(STORAGE_KEY_START_TIME, new Date(startTime).toISOString());

    setIsRunning(true);
    setIsTimeUp(false);

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
  }, [calculateElapsedTime]);

  // アプリの状態が変更されたときのハンドラ
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // アプリがフォアグラウンドに戻ったとき
      const elapsed = await calculateElapsedTime();
      const newRemainingTime = TOTAL_TIME_SECONDS - elapsed;
      
      // バックグラウンドでの経過時間を反映
      setRemainingTime(Math.max(0, newRemainingTime));
      
      if (newRemainingTime > 0) {
        // タイマーがまだ残っている場合は再開
        const storedStartTime = await AsyncStorage.getItem(STORAGE_KEY_START_TIME);
        if (storedStartTime) {
            // アプリがアクティブな状態に戻ったときに、タイマーを再開させる
            // 既にisRunningがtrueの場合は、startTimer内で既存のintervalがクリアされるため問題ない
            startTimer(new Date(storedStartTime).getTime());
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
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // アプリがバックグラウンドに移行したとき
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        // バックグラウンドでも経過時間は AsyncStorage に保存された開始時刻から計算されるため、
        // isRunning が true であれば、特に何もしなくてもバックグラウンドでの時間は考慮される
    }
    appState.current = nextAppState;
  }, [isRunning, calculateElapsedTime, startTimer]);

  // 初回ロードとアンマウント時の処理
  useEffect(() => {
    // AppStateのリスナー設定
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // 起動時に AsyncStorage から状態を復元
    const loadState = async () => {
        const storedStartTime = await AsyncStorage.getItem(STORAGE_KEY_START_TIME);
        if (storedStartTime) {
            const elapsed = await calculateElapsedTime();
            const newRemainingTime = TOTAL_TIME_SECONDS - elapsed;
            
            if (newRemainingTime > 0) {
                // 残り時間がある場合はタイマーを再開
                startTimer(new Date(storedStartTime).getTime());
            } else {
                // 既に時間が過ぎている場合はタイムアップ状態に
                setRemainingTime(0);
                setIsTimeUp(true);
                await AsyncStorage.removeItem(STORAGE_KEY_START_TIME);
            }
        }
    };
    loadState();

    return () => {
      // クリーンアップ
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
    };
  }, [calculateElapsedTime, startTimer, handleAppStateChange]);

  const handleStartTimer = () => {
    if (!isRunning) {
        startTimer();
    }
  };

  const handleExitStore = () => {
    resetTimer(); // タイマー状態をクリア
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
        
        {/* スタートボタン */}
        {!isRunning && !isTimeUp && (
          <TouchableOpacity 
            style={styles.startButton} 
            onPress={handleStartTimer}
          >
            <Text style={styles.startButtonText}>タイマー開始 (10分)</Text>
          </TouchableOpacity>
        )}
        
        {/* タイムアップ表示 */}
        {isTimeUp && (
          <Text style={styles.timeUpText}>⏰ タイムアップ！</Text>
        )}
        
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
            !isTimeUp && styles.exitButtonDisabled // 10分未満は無効なスタイルを適用
          ]} 
          onPress={handleExitStore}
          disabled={!isTimeUp} // 10分経過後にのみ有効化
        >
          <Text style={styles.exitButtonText}>
            お店を出る (レビュー書く!)
          </Text>
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
    marginBottom: 20, // スタートボタンとの間隔
  },
  startButton: {
    backgroundColor: colors.button.secondary, // 新しいボタンのスタイル
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginTop: 20,
  },
  startButtonText: {
    ...typography.button,
    color: colors.text.white,
    fontWeight: 'bold',
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