import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  Image, // 画像表示のために追加
  ActivityIndicator, // ローディング表示のために追加
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router"; // useLocalSearchParamsを追加
import AsyncStorage from "@react-native-async-storage/async-storage";
// ※ 以下、プロジェクトの構造に合わせてパスを修正してください
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/global";
import { useTimer, TIMER_STORAGE_KEYS } from "../../hooks/useTimer";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { fetch } from "expo/fetch";

// ⚠️ 環境変数として設定してください
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAP_API_KEY;

// 取得する店舗情報の型定義
type StoreDetails = {
  name: string;
  photoUrl: string | null;
  // 必要に応じて他のフィールドを追加
};

export default function Timer() {
  const router = useRouter();
  // Dynamic Routeから id (ここでは place_id として利用) を取得
  // id は文字列として取得されます
  const { id } = useLocalSearchParams<{ id: string }>();

  // 店舗情報を保持するためのState
  const [store, setStore] = useState<StoreDetails | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // useTimerフックを使用 (既存のロジックは省略)
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

  // --- 🌟 Google Place Details APIから情報を取得するロジック 🌟 ---
  useEffect(() => {
    // id (place_id) が存在しない場合は処理をスキップ
    if (!id || typeof id !== "string") {
      setLoadingStore(false);
      setFetchError("店舗ID (place_id) が見つかりません。");
      return;
    }

    const fetchStoreDetails = async () => {
      setLoadingStore(true);
      setFetchError(null);

      // ユーザーが提供したURLの構造を使用
      const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${id}&fields=name,photos&key=${GOOGLE_MAPS_API_KEY}`;

      try {
        const response = await fetch(detailUrl);
        const json = await response.json();

        if (json.status === "OK" && json.result) {
          const result = json.result;
          let photoUrl = null;

          // 写真があれば、最初の写真のリファレンスを使ってPhoto APIのURLを構築
          if (result.photos && result.photos.length > 0) {
            const photoReference = result.photos[0].photo_reference;
            // Google Place Photos API の URL構造
            photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
          }

          setStore({
            name: result.name,
            photoUrl: photoUrl,
          });
        } else {
          // APIエラー応答（例: NOT_FOUND, ZERO_RESULTS）
          setFetchError(`店舗情報の取得に失敗しました: ${json.status}`);
        }
      } catch (error) {
        console.error("API Fetch Error:", error);
        setFetchError("ネットワークエラー、またはAPIキーが不正です。");
      } finally {
        setLoadingStore(false);
      }
    };

    fetchStoreDetails();
  }, [id]); // id が変更されたときに再実行

  // ... (useFocusEffectとuseEffectは既存のロジックをそのまま使用) ...
  // useFocusEffectとAppStateのリスナーはコードの大部分を占めるため、ここでは省略します
  // 既存のコードからそのままコピーしてください

  useFocusEffect(
    useCallback(() => {
      // ... 既存の useFocusEffect ロジック ...
      const checkAndResetIfNeeded = async () => {
        const storedSessionId = await AsyncStorage.getItem(
          TIMER_STORAGE_KEYS.SESSION
        );
        const storedStartTime = await AsyncStorage.getItem(
          TIMER_STORAGE_KEYS.START_TIME
        );

        if (storedSessionId && storedStartTime) {
          if (currentSessionId === null) {
            await resetTimer();
            if (!isTimeUp) {
              await startTimer();
            }
          } else if (storedSessionId !== currentSessionId) {
            await resetTimer();
            if (!isTimeUp) {
              await startTimer();
            }
          } else {
            const elapsed = await calculateElapsedTime();
            const newRemainingTime = 10 * 60 - elapsed;

            if (newRemainingTime > 0 && !isTimeUp) {
              if (!isRunning) {
                startTimer(
                  new Date(storedStartTime).getTime(),
                  storedSessionId
                );
              }
            }
          }
        } else if (!isTimeUp) {
          await startTimer();
        }
      };

      checkAndResetIfNeeded();

      return () => {};
    }, [
      currentSessionId,
      isRunning,
      isTimeUp,
      calculateElapsedTime,
      startTimer,
      resetTimer,
    ])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  const handleExitStore = async () => {
    await resetTimer(); // タイマー状態をクリア
    router.push(`/${id}/review` as any); // /review に遷移
  };
  const timerText = formatTime(remainingTime);

  // --- ローディング/エラー表示 ---
  if (loadingStore) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.headerText}>お店の情報を取得中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fetchError || !store) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, styles.center]}>
          <Text style={styles.timeUpText}>エラーが発生しました</Text>
          <Text style={styles.runningText}>
            {fetchError || "店舗情報が見つかりません"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- メインコンポーネントのレンダリング ---
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerText}>未開の地を探索中...</Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/profile" as any)}
          ></TouchableOpacity>
        </View>

        <View style={styles.timerContainer}>
          {/* タイマー表示 */}
          <Text style={styles.timerText}>{timerText}</Text>
        </View>

        {/* --- 店舗情報 --- */}
        <View style={styles.storeInfoContainer}>
          {/* 画像を表示 (photoUrl があれば Image を使用) */}
          {store.photoUrl ? (
            <Image source={{ uri: store.photoUrl }} style={styles.storeImage} />
          ) : (
            // 画像がない場合はフォールバックアイコン
            <View style={styles.storeIcon}>
              <Text style={styles.storeIconText}>🏪</Text>
            </View>
          )}
          {/* 店舗名を表示 */}
          <Text style={[globalStyles.text, styles.storeName]}>{store.name}</Text>
        </View>

        {/* --- 退店ボタン --- */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.exitButton, !isTimeUp && styles.exitButtonDisabled]}
            onPress={handleExitStore}
            disabled={!isTimeUp}
          >
            <Text style={[globalStyles.text, styles.exitButtonText]}>
              お店を出る (レビュー書く!)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ... (既存の styles をそのまま使用し、必要に応じて center スタイルなどを追加) ...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    // ローディング/エラー用に追加
    justifyContent: "center",
    alignItems: "center",
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
    color: colors.text.danger,
    marginTop: 20,
  },
  storeInfoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  storeIcon: {
    width: 100,
    height: 100,
    backgroundColor: colors.surface,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  storeIconText: {
    fontSize: 40,
  },
  storeImage: {
    // 画像表示用のスタイル
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    resizeMode: "cover",
    borderWidth: 2,
    borderColor: colors.primary,
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
    backgroundColor: colors.button.disabled,
    opacity: 0.6,
  },
  exitButtonText: {
    ...typography.button,
    color: colors.text.white,
    textAlign: "center",
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
});
