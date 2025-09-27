import { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  ActivityIndicator, // ローディング用に追加
} from "react-native";
// MapViewとMarkerはreact-native-mapsからインポート
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { fetch } from "expo/fetch";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";

// ★★★ ここにあなたのGoogle Maps APIキーを挿入してください ★★★
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAP_API_KEY;
const SEARCH_RADIUS = 5000; // 検索半径 (メートル)
const SEARCH_RADII = [2000, 5000, 10000]; // 段階的検索用の半径リスト
const MAX_REVIEW_COUNT = 50; // ★レビュー数の上限 (50件以下をフィルタリング)★

// 新しいPlaces API (New)用の設定
const NEW_API_BASE_URL = "https://places.googleapis.com/v1/places:searchNearby";
// 新APIで有効なタイプのみを使用
const FOOD_TYPES = ["restaurant", "cafe", "bar", "bakery"];
const MAX_RESULTS_PER_REQUEST = 20; // 新APIの最大値

// 新しいPlaces API (New)を使用

// 新しいPlaces API (New)のデータ型のみを使用

// 新しいPlaces API (New)のレスポンス型
type NewAPIPlace = {
  id: string;
  displayName: {
    text: string;
    languageCode?: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  userRatingCount?: number;
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
  }>;
  priceLevel?: string;
};

// マーカー表示用のデータ型
type PlaceMarker = {
  id: string; // place_idを使用
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  photoReference?: string; // 写真の参照ID
};

// ===============================================
// 距離計算ヘルパー関数
// ===============================================

/**
 * 2点間の距離をメートル単位で計算します (Haversineの公式を使用)
 * @param lat1 1点目の緯度
 * @param lon1 1点目の経度
 * @param lat2 2点目の緯度
 * @param lon2 2点目の経度
 * @returns 距離 (メートル)
 */
const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // 地球の半径 (メートル)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 距離 (メートル)
};

// ===============================================
// メインコンポーネント
// ===============================================

export default function MapSample() {
  const router = useRouter();

  // ... (既存の useState 定義) ...
  const [initRegion, setInitRegion] = useState<Region | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlaceMarker[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPlace, setSelectedPlace] = useState<PlaceMarker | null>(null);

  // 🌟 ユーザーの現在地を保持するステートを追加 🌟
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  // 🌟 ボタンの有効/無効を判定する半径 (50m) 🌟
  const ENTER_RADIUS_METER = 5000;

  // Places API (New)用の写真URL生成関数
  const getPhotoUrl = (photoName: string) => {
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${GOOGLE_MAPS_API_KEY}`;
  };

  // 新しいPlaces API (New)を使用した検索関数
  const fetchPlacesWithNewAPI = useCallback(
    async (
      latitude: number,
      longitude: number,
      includedTypes: string[] = FOOD_TYPES,
      radius: number = SEARCH_RADIUS
    ) => {
      // デバッグ用ログ
      console.log("リクエストパラメータ:", {
        latitude,
        longitude,
        includedTypes,
        radius: radius,
      });

      const requestBody = {
        includedTypes,
        maxResultCount: MAX_RESULTS_PER_REQUEST,
        locationRestriction: {
          circle: {
            center: {
              latitude,
              longitude,
            },
            radius: radius,
          },
        },
        // ランキングの設定を追加
        rankPreference: "POPULARITY",
      };

      const fieldMask =
        "places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.photos";

      console.log("リクエストボディ:", JSON.stringify(requestBody, null, 2));

      try {
        const response = await fetch(NEW_API_BASE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY || "",
            "X-Goog-FieldMask": fieldMask,
          },
          body: JSON.stringify(requestBody),
        });

        console.log("レスポンスステータス:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("エラーレスポンス:", errorText);
          throw new Error(
            `HTTP error! status: ${response.status}, body: ${errorText}`
          );
        }

        const data = await response.json();

        if (data.places) {
          console.log(`API応答: ${data.places.length}件の場所を取得`);

          const filteredPlaces = data.places
            .filter((place: NewAPIPlace) => {
              const reviewCount = place.userRatingCount || 0;
              const isWithinLimit = reviewCount <= MAX_REVIEW_COUNT;
              console.log(
                `${place.displayName.text}: レビュー数${reviewCount}件 - ${isWithinLimit ? "採用" : "除外"}`
              );
              return isWithinLimit;
            })
            .map((place: NewAPIPlace) => {
              const photoReference = place.photos?.[0]?.name;
              return {
                id: place.id,
                latitude: place.location.latitude,
                longitude: place.location.longitude,
                title: place.displayName.text,
                description: `評価: ${place.rating?.toFixed(1) || "なし"} (レビュー数: ${place.userRatingCount || 0}件)`,
                photoReference: photoReference,
              };
            });

          console.log(
            `フィルタリング後: ${filteredPlaces.length}件の場所が条件に合致`
          );
          return filteredPlaces;
        } else {
          console.log("API応答にplacesフィールドがありません");
        }

        return [];
      } catch (error) {
        console.error("New Places API Error:", error);
        throw error;
      }
    },
    []
  );

  // マーカーがタップされたときのハンドラー (変更なし)
  const handleMarkerPress = (place: PlaceMarker) => {
    setSelectedPlace(place);
  };

  // 新しいPlaces API (New)を使用したメイン検索関数
  const fetchAllPlaces = useCallback(
    async (latitude: number, longitude: number) => {
      setIsLoading(true);
      let allPlaces: PlaceMarker[] = [];

      // APIキーの確認
      if (!GOOGLE_MAPS_API_KEY) {
        console.error("Google Maps API キーが設定されていません");
        setErrorMsg("API キーが設定されていません。設定を確認してください。");
        return [];
      }

      try {
        console.log("新しいPlaces API (New)で検索を開始...");

        // 段階的検索を実行（複数の半径で検索）
        for (const searchRadius of SEARCH_RADII) {
          console.log(`半径${searchRadius}mで検索を実行中...`);

          try {
            // 全タイプで一括検索を試行
            console.log("全タイプで一括検索を実行中...");
            const allTypeResults = await fetchPlacesWithNewAPI(
              latitude,
              longitude,
              FOOD_TYPES,
              searchRadius
            );
            if (allTypeResults.length > 0) {
              console.log(
                `一括検索成功: ${allTypeResults.length}件の店舗を取得`
              );
              allPlaces.push(...allTypeResults);
            } else {
              console.log("一括検索で結果0件、個別検索に切り替え...");

              // 個別検索にフォールバック
              const searchPromises = FOOD_TYPES.map(async (type) => {
                try {
                  console.log(`個別検索実行中: ${type} (半径${searchRadius}m)`);
                  const typeResults = await fetchPlacesWithNewAPI(
                    latitude,
                    longitude,
                    [type],
                    searchRadius
                  );
                  console.log(`${type}の検索結果: ${typeResults.length}件`);
                  return typeResults;
                } catch (error) {
                  console.warn(`検索エラー (${type}):`, error);
                  return [];
                }
              });

              const results = await Promise.all(searchPromises);
              const flatResults = results.flat();
              allPlaces.push(...flatResults);
              console.log(`個別検索の合計結果: ${flatResults.length}件`);
            }
          } catch (error) {
            console.error(`半径${searchRadius}mの検索でエラー:`, error);
          }

          // 十分な結果が得られた場合は早期終了
          if (allPlaces.length >= 15) {
            console.log(
              `十分な結果が得られました (${allPlaces.length}件)、検索を終了`
            );
            break;
          }
        }

        // 重複除去（同じIDの場所を削除）
        const uniquePlaces = allPlaces.reduce((acc: PlaceMarker[], place) => {
          if (!acc.find((p) => p.id === place.id)) {
            acc.push(place);
          }
          return acc;
        }, []);

        console.log(
          `検索完了: ${uniquePlaces.length}件の店舗を取得（重複除去前: ${allPlaces.length}件）`
        );

        return uniquePlaces;
      } catch (error) {
        console.error("検索中にエラーが発生しました:", error);
        setErrorMsg("飲食店情報の検索中にエラーが発生しました。");
        return [];
      }
    },
    [fetchPlacesWithNewAPI]
  );

  // --- 🌟 useEffect: 現在地取得とAPIコール 🌟 ---
  useEffect(() => {
    const getCurrentLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("位置情報へのアクセスが拒否されました");
        setIsLoading(false);
        return;
      }

      try {
        const locationData = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = locationData.coords;

        // 🌟 1. 現在地ステートを更新 🌟
        setLocation({ latitude, longitude });

        // 2. マップの初期表示領域を設定
        setInitRegion({
          latitude: latitude,
          longitude: longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });

        // 3. 現在地情報を使用して飲食店情報を取得
        const placeMarkers = await fetchAllPlaces(latitude, longitude);
        setPlaces(placeMarkers);
      } catch (error) {
        console.error("現在地情報取得エラー：", error);
        setErrorMsg("現在地情報の取得中にエラーが発生しました。");
      } finally {
        setIsLoading(false);
      }
    };
    getCurrentLocation();
  }, [fetchAllPlaces]);

  // ★追加: モーダル内のお店の入るボタンのハンドラー
  const handleModalEnterStore = () => {
    if (!selectedPlace) return;

    // 🌟 距離を再計算して、50m以内か最終確認 🌟
    if (location) {
      const distance = getDistance(
        location.latitude,
        location.longitude,
        selectedPlace.latitude,
        selectedPlace.longitude
      );

      if (distance <= ENTER_RADIUS_METER) {
        setSelectedPlace(null);
        // Dynamic Routeへの遷移
        router.push(`/${selectedPlace.id}/timer` as any);
      } else {
        // 50mを超えている場合はエラーアラート
        Alert.alert(
          "距離エラー",
          `お店に入るには半径${ENTER_RADIUS_METER}m以内に移動してください。(現在地からの距離: 約${Math.round(distance)}m)`,
          [{ text: "OK" }]
        );
      }
    } else {
      Alert.alert("エラー", "現在地情報が取得できていません。");
    }
  };

  // ★更新: 詳細情報表示用モーダルコンポーネント
  const renderPlaceModal = () => {
    if (!selectedPlace) return null;

    // 写真URLの生成
    const photoUrl = selectedPlace.photoReference
      ? getPhotoUrl(selectedPlace.photoReference)
      : null;

    // 🌟 ボタンの有効/無効を判定 🌟
    let isEnterButtonDisabled = true;
    let distanceMessage = "現在地を計算中...";

    if (location) {
      const distance = getDistance(
        location.latitude,
        location.longitude,
        selectedPlace.latitude,
        selectedPlace.longitude
      );

      // 50m以内であればボタンを有効化
      isEnterButtonDisabled = distance > ENTER_RADIUS_METER;
      distanceMessage = `現在地からの距離: 約${Math.round(distance)}m`;
    }

    return (
      <Modal
        // ... (Modalのプロパティはそのまま) ...
        animationType="slide"
        transparent={true}
        visible={!!selectedPlace}
        onRequestClose={() => setSelectedPlace(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 閉じるボタン (Xアイコン) を右上に配置 */}
            <TouchableOpacity
              style={styles.closeXButton}
              onPress={() => setSelectedPlace(null)}
            >
              <Text style={styles.closeXButtonText}>×</Text>
            </TouchableOpacity>

            {/* タイトルと写真 */}
            <Text style={styles.modalTitle}>{selectedPlace.title}</Text>

            {/* 写真の表示は省略 */}
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={styles.modalImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={{ color: colors.text.secondary }}>
                  写真はありません
                </Text>
              </View>
            )}

            {/* 説明文 (レビュー数) */}
            <Text style={styles.modalDescription}>
              {selectedPlace.description}
            </Text>

            {/* 🌟 距離の表示 🌟 */}
            <Text style={styles.distanceText}>{distanceMessage}</Text>

            {/* お店に入るボタン (下部に大きく配置) */}
            <TouchableOpacity
              style={[
                styles.enterStoreButton,
                isEnterButtonDisabled && styles.disabledButton, // 無効時のスタイルを適用
              ]}
              onPress={handleModalEnterStore}
              disabled={isEnterButtonDisabled} // 50m以上離れている場合は無効
            >
              <Text style={styles.enterButtonText}>
                {isEnterButtonDisabled
                  ? `入店不可 (${ENTER_RADIUS_METER}m以内)`
                  : "お店に入る"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // ... (return内のコンポーネントは変更なし) ...
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>レビュー50件以下マップ</Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/profile" as any)}
          >
            <View style={styles.profileIcon}>
              <Text style={styles.profileIconText}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>

        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : (
          <MapView
            style={styles.mapContainer}
            region={initRegion || undefined}
            showsUserLocation={true}
            provider="google"
            // マップが完全にロードされるまで、initRegionがnullの場合は表示しない
            initialRegion={initRegion || undefined}
          >
            {/* 取得した飲食店マーカーの描画 */}
            {places.map((place) => (
              <Marker
                key={place.id}
                coordinate={{
                  latitude: place.latitude,
                  longitude: place.longitude,
                }}
                title={place.title}
                description={place.description}
                pinColor="blue"
                onPress={() => handleMarkerPress(place)}
              />
            ))}
          </MapView>
        )}

        {/* ローディングインジケーター */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginBottom: 10 }}
            />
            <Text style={styles.loadingText}>
              場所を検索・フィルタリング中です...
            </Text>
          </View>
        )}

        {/* {!isLoading && !errorMsg && places.length === 0 && initRegion && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>
              レビュー50件以下の飲食店は見つかりませんでした。
            </Text>
          </View>
        )} */}

        {/* ★追加: 詳細モーダルを表示★ */}
        {renderPlaceModal()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... (既存のスタイルは省略) ...

  // 🌟 距離表示用テキストのスタイルを追加 🌟
  distanceText: {
    ...typography.body,
    textAlign: "center",
    color: colors.text.secondary,
    marginBottom: 10,
  },
  // 🌟 無効時のボタンのスタイルを追加 🌟
  disabledButton: {
    backgroundColor: colors.button.secondary, // 無効時の色
    opacity: 0.8,
  },
  enterStoreButton: {
    backgroundColor: colors.button.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },
  enterButtonText: {
    ...typography.button,
    color: colors.text.white,
  },
  closeButtonText: {
    ...typography.body,
    color: colors.text.white,
  },
  // ... (他のスタイルは変更なし) ...
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.heading,
    color: colors.text.white,
    textAlign: "center",
    flex: 1,
  },
  profileButton: {
    position: "absolute",
    right: 20,
    top: 60,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileIconText: {
    fontSize: 20,
    color: colors.text.white,
  },
  mapContainer: {
    width: "100%",
    height: "100%",
    flex: 1,
    backgroundColor: colors.map.water,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    ...typography.body,
    color: "red",
    textAlign: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    ...typography.heading,
    color: colors.text.secondary,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  // ★Modal関連のスタイル更新
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
    maxHeight: "75%",
    position: "relative",
  },
  modalTitle: {
    ...typography.heading,
    marginBottom: 10,
    color: colors.text.dark,
  },
  modalDescription: {
    ...typography.body,
    marginTop: 8,
    marginBottom: 20,
    color: colors.text.secondary,
  },
  modalImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  imagePlaceholder: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  // ★閉じるXボタンのスタイル
  closeXButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
    zIndex: 20,
    backgroundColor: colors.button.secondary + "33",
  },
  closeXButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text.dark,
    lineHeight: 20,
  },
  // 元のスタイル (地図画面のボタン)
  bottomContainer: {
    padding: 20,
    backgroundColor: colors.background,
  },
  enterButton: {
    backgroundColor: colors.button.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: "center",
  },
});
