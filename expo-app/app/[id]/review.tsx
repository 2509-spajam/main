import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Linking,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/global";
import Constants from "expo-constants";
import { fetch } from "expo/fetch";
import { ReviewedStoresManager } from "../../utils/reviewedStores";

// ⚠️ 環境変数として設定してください
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAP_API_KEY;

// 取得する店舗情報の型定義
type StoreDetails = {
  name: string;
  photoUrl: string | null;
  // 必要に応じて他のフィールドを追加
};

export default function Review() {
  const router = useRouter();
  // Dynamic Routeから id (ここでは place_id として利用) を取得
  const { id } = useLocalSearchParams<{ id: string }>();

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewed, setReviewed] = useState(false); // Googleレビュー済み状態

  // 店舗情報を保持するためのState
  const [store, setStore] = useState<StoreDetails | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  // Googleレビュー投稿ページに遷移する
  const handleGoogleReview = () => {
    const placeId = id; // idを使用、フォールバック付き
    const url = `https://search.google.com/local/writereview?placeid=${placeId}`;
    Linking.openURL(url);
    setReviewed(true); // 遷移したらレビュー済みとみなす
  };

  const handleSubmitReview = async () => {
    if (id && typeof id === "string") {
      // レビュー済みとしてAsyncStorageに保存
      const success = await ReviewedStoresManager.addReviewedStore(id);
      if (success) {
        console.log(`店舗ID ${id} をレビュー済みとして保存しました`);
      }
    }
    router.push("/reward" as any);
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <TouchableOpacity
        key={index}
        onPress={() => setRating(index + 1)}
        style={styles.starButton}
      >
        <Text style={[styles.star, rating > index && styles.starFilled]}>
          ★
        </Text>
      </TouchableOpacity>
    ));
  };

  // --- ローディング/エラー表示 ---
  if (loadingStore) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={[globalStyles.text, styles.headerText]}>レビューを書く</Text>
        </View>
        <View style={[styles.content, styles.center]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[globalStyles.text, styles.loadingText]}>お店の情報を取得中...</Text>
        </View>
      </ScrollView>
    );
  }

  if (fetchError || !store) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={[globalStyles.text, styles.headerText]}>レビューを書く</Text>
        </View>
        <View style={[styles.content, styles.center]}>
          <Text style={[globalStyles.text, styles.errorText]}>エラーが発生しました</Text>
          <Text style={[globalStyles.text, styles.errorSubText]}>
            {fetchError || "店舗情報が見つかりません"}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
    <Text style={[globalStyles.text, styles.headerText]}>レビューを書く</Text>
      </View>

      <View style={styles.content}>
        {/* 店舗情報 */}
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

        {/* 説明文 */}
        <Text
          style={{
            ...typography.body,
            color: colors.text.secondary,
            textAlign: "center",
            marginBottom: 24,
            fontFamily: "KosugiMaru",
          }}
        >
          Googleのレビュー投稿ページに遷移します。投稿後「次へ」ボタンが有効になります。
        </Text>

        {/* 感謝メッセージ（レビュー済みの場合のみ表示） */}
        {reviewed && (
          <Text style={[globalStyles.text, styles.thankYouText]}>ご協力ありがとうございます！</Text>
        )}
        {/* Googleレビュー投稿ボタン */}
        <TouchableOpacity
          style={[
            styles.googleReviewButton,
            reviewed && styles.submitButtonDisabled,
          ]}
          onPress={reviewed ? undefined : handleGoogleReview}
          disabled={reviewed}
        >
          <Text style={[globalStyles.text, styles.googleReviewButtonText]}>
            {reviewed ? "レビュー済み" : "Googleで店舗レビューを書く"}
          </Text>
        </TouchableOpacity>

        {/* 次へボタン（レビュー前は灰色・非活性、レビュー後は有効） */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            !reviewed && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitReview}
          disabled={!reviewed}
        >
          <Text style={[globalStyles.text, styles.submitButtonText]}>次へ</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  content: {
    padding: 20,
  },
  storeInfoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  storeIcon: {
    width: 60,
    height: 60,
    backgroundColor: colors.surface,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  storeIconText: {
    fontSize: 30,
  },
  storeName: {
    ...typography.subheading,
    color: colors.text.primary,
  },
  ratingContainer: {
    marginBottom: 24,
  },
  ratingLabel: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 32,
    color: colors.text.light,
  },
  starFilled: {
    color: colors.accent,
  },
  reviewInputContainer: {
    marginBottom: 32,
  },
  reviewLabel: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: 8,
  },
  reviewInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    textAlignVertical: "top",
    minHeight: 120,
    ...typography.body,
    color: colors.text.primary,
  },
  submitButton: {
    backgroundColor: colors.button.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: colors.button.disabled,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.text.white,
  },
  googleReviewButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 16,
  },
  googleReviewButtonText: {
    ...typography.button,
    color: colors.text.white,
  },
  thankYouText: {
    ...typography.body,
    color: colors.accent,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "bold",
    fontSize: 18,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 16,
    textAlign: "center",
  },
  errorText: {
    ...typography.subheading,
    color: colors.text.danger,
    textAlign: "center",
    marginBottom: 8,
  },
  errorSubText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: "center",
  },
  storeImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    resizeMode: "cover",
    borderWidth: 2,
    borderColor: colors.primary,
  },
});
