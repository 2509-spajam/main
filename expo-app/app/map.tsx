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
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";

// ★★★ ここにあなたのGoogle Maps APIキーを挿入してください ★★★
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAP_API_KEY;
const SEARCH_RADIUS = 5000; // 検索半径 (メートル)
const SEARCH_TYPES_KEYWORD = "bar,bakery,cafe,restaurant"; // 検索したい飲食店タイプ
const MAX_REVIEW_COUNT = 50; // ★レビュー数の上限 (50件以下をフィルタリング)★

// Nearby Search APIから取得する基本的な場所のデータ型
type BasicPlace = {
  place_id: string; // 一意キー
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
};

// マーカー表示用のデータ型
type PlaceMarker = {
  id: string; // place_idを使用
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  photoReference?: string; // ★追加: 写真の参照ID
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
  const ENTER_RADIUS_METER = 50;

  // Photo ReferenceからGoogle Places Photo APIのURLを生成するヘルパー関数 (変更なし)
  const getPhotoUrl = (photoRef: string) => {
    // ... (既存のロジック) ...
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${GOOGLE_MAPS_API_KEY}`;
  };

  // マーカーがタップされたときのハンドラー (変更なし)
  const handleMarkerPress = (place: PlaceMarker) => {
    setSelectedPlace(place);
  };

  // Places APIから飲食店情報を取得する関数 (変更なし)
  const fetchPlaces = useCallback(
    async (latitude: number, longitude: number) => {
      setIsLoading(true);

      const location = `${latitude},${longitude}`;
      let basicPlaces: BasicPlace[] = []; // Nearby Searchから取得した場所IDのリスト
      let pageToken: string | undefined = undefined;

      // 1. Nearby Search APIで場所のIDと基本情報を最大3ページ取得する
      let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${SEARCH_RADIUS}&keyword=${SEARCH_TYPES_KEYWORD}&type=establishment&key=${GOOGLE_MAPS_API_KEY}`;

      for (let i = 0; i < 3; i++) {
        if (i > 0) {
          if (!pageToken) break;
          // APIの推奨により、ページトークンを使用する前に2秒の遅延
          await new Promise((resolve) => setTimeout(resolve, 2000));
          url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${pageToken}&key=${GOOGLE_MAPS_API_KEY}`;
        }

        try {
          const response = await fetch(url);
          const data = await response.json();

          if (data.status === "OK") {
            basicPlaces = [...basicPlaces, ...data.results];
            pageToken = data.next_page_token;
            if (!pageToken) break;
          } else if (data.status === "ZERO_RESULTS") {
            break;
          } else {
            console.error(
              "Places API Error (Nearby):",
              data.status,
              data.error_message
            );
            setErrorMsg(
              `検索APIエラー: ${data.status}. コンソールを確認してください。`
            );
            break;
          }
        } catch (error) {
          console.error("Fetch Nearby Error:", error);
          setErrorMsg("飲食店情報の検索中にエラーが発生しました。");
          break;
        }
      }

      // 2. 取得した各場所IDを使って詳細情報を取得し、フィルタリングする
      const filteredMarkers: PlaceMarker[] = [];

      for (const place of basicPlaces) {
        // APIのレート制限回避のため、短い遅延 (200ms) を入れる
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Place Details APIのURL (photosフィールドを追加)
        const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,user_ratings_total,geometry,vicinity,photos&key=${GOOGLE_MAPS_API_KEY}`;

        try {
          const detailResponse = await fetch(detailUrl);
          const detailData = await detailResponse.json();

          if (detailData.status === "OK" && detailData.result) {
            const result = detailData.result;
            // user_ratings_total がない場合 (レビューがない場合) は0とする
            const reviewCount = result.user_ratings_total || 0;

            // ★レビュー数50件以下の条件でフィルタリング★
            if (reviewCount <= MAX_REVIEW_COUNT) {
              // 最初の写真参照を取得
              const photoReference = result.photos?.[0]?.photo_reference;

              filteredMarkers.push({
                id: place.place_id,
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng,
                title: result.name,
                // レビュー数をDescriptionに含めて表示
                description: `${result.vicinity} (レビュー数: ${reviewCount}件)`,
                photoReference: photoReference, // 写真参照を保存
              });
            }
          } else if (detailData.status !== "NOT_FOUND") {
            console.warn(
              `Place Details API Warning (${place.name}): ${detailData.status}`
            );
          }
        } catch (error) {
          console.error("Fetch Place Details Error:", error);
        }
      }

      setIsLoading(false);
      return filteredMarkers;
    },
    []
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
        const placeMarkers = await fetchPlaces(latitude, longitude);
        setPlaces(placeMarkers);
      } catch (error) {
        console.error("現在地情報取得エラー：", error);
        setErrorMsg("現在地情報の取得中にエラーが発生しました。");
      } finally {
        setIsLoading(false);
      }
    };
    getCurrentLocation();
  }, [fetchPlaces]);

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
  },
  headerTitle: {
    ...typography.heading,
    color: colors.text.white,
    textAlign: "center",
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
  // ★お店に入るボタン (モーダル内) のスタイル
  enterStoreButton: {
    backgroundColor: colors.button.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
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
  enterButtonText: {
    ...typography.button,
    color: colors.text.white,
  },
});
