import { useState, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 定数
const TOTAL_TIME_SECONDS = 10 * 60; // 10分 = 600秒
const STORAGE_KEY_START_TIME = "@timer_start_time";
const STORAGE_KEY_TIMER_SESSION = "@timer_session_id"; // セッション管理用

// useTimerの戻り値の型定義
export interface UseTimerReturn {
  // 状態
  remainingTime: number;
  isRunning: boolean;
  isTimeUp: boolean;
  currentSessionId: string | null;

  // アクション
  startTimer: (
    initialStartTime?: number | null,
    sessionId?: string | null
  ) => Promise<void>;
  resetTimer: () => Promise<void>;

  // ヘルパー
  formatTime: (totalSeconds: number) => string;

  // 内部関数（必要に応じて公開）
  calculateElapsedTime: () => Promise<number>;
  startNewSession: () => Promise<string>;
  handleAppStateChange: (nextAppState: AppStateStatus) => Promise<void>;
}

// 秒数をMM:SS形式にフォーマットするヘルパー関数
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.floor(Math.max(0, totalSeconds) % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export const useTimer = (): UseTimerReturn => {
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

  // アプリの状態が変更されたときのハンドラー
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

  return {
    // 状態
    remainingTime,
    isRunning,
    isTimeUp,
    currentSessionId,

    // アクション
    startTimer,
    resetTimer,

    // ヘルパー
    formatTime,

    // 内部関数
    calculateElapsedTime,
    startNewSession,
    handleAppStateChange,
  };
};

// AsyncStorageのキーをエクスポート（テストや他の場所で使用する場合）
export const TIMER_STORAGE_KEYS = {
  START_TIME: STORAGE_KEY_START_TIME,
  SESSION: STORAGE_KEY_TIMER_SESSION,
} as const;

// 定数もエクスポート
export const TIMER_CONSTANTS = {
  TOTAL_TIME_SECONDS,
} as const;
