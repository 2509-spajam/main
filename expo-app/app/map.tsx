import { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Alert, // エラーメッセージ表示用
  Modal, // ★追加: 詳細表示用のモーダル
  Image, // ★追加: 写真表示用
} from "react-native";
// MapViewとMarkerはreact-native-mapsからインポート
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router"; // expo-router のインポートはそのまま維持
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { fetch } from "expo/fetch";

// ===============================================
// APIキーと型の定義
// ===============================================

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
// ダミーのスタイル・カラー定義 (動作確認用)
// ===============================================

// ユーザーのプロジェクトに合わせて実際の`colors`と`typography`に置き換えてください。
const colors = {
  background: "#f0f0f0",
  primary: "#4CAF50",
  text: {
    white: "#ffffff",
    secondary: "#666666",
    dark: "#333333",
  },
  button: {
    primary: "#FF9800",
    secondary: "#9E9E9E", // 閉じるボタン用に新しい色を追加
  },
  map: {
    water: "#AECBFA",
  },
  modal: {
    background: "#ffffff",
  },
};

const typography = {
  heading: {
    fontSize: 20,
    fontWeight: "bold" as "bold",
  },
  subHeading: {
    fontSize: 18,
    fontWeight: "600" as "600",
  },
  body: {
    fontSize: 16,
  },
  button: {
    fontSize: 18,
    fontWeight: "600" as "600",
  },
};

// ===============================================
// メインコンポーネント
// ===============================================

export default function MapSample() {
  const router = useRouter();

  // 現在地の表示範囲
  const [initRegion, setInitRegion] = useState<Region | null>(null);
  // エラーメッセージ
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // 取得した飲食店マーカーデータ
  const [places, setPlaces] = useState<PlaceMarker[]>([]);
  // ローディング状態
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // ★追加: 選択されたマーカーの情報 (Modal表示に使用)★
  const [selectedPlace, setSelectedPlace] = useState<PlaceMarker | null>(null);

  // Photo ReferenceからGoogle Places Photo APIのURLを生成するヘルパー関数
  const getPhotoUrl = (photoRef: string) => {
    // 幅400ピクセルに設定
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${GOOGLE_MAPS_API_KEY}`;
  };

  // マーカーがタップされたときのハンドラー
  const handleMarkerPress = (place: PlaceMarker) => {
    setSelectedPlace(place);
  };

  // Places APIから飲食店情報を取得する関数
  const fetchPlaces = useCallback(
    async (latitude: number, longitude: number) => {
      setIsLoading(true);

      const location = `${latitude},${longitude}`;
      let basicPlaces: BasicPlace[] = []; // Nearby Searchから取得した場所IDのリスト
      let pageToken: string | undefined = undefined;

      // 1. Nearby Search APIで場所のIDと基本情報を最大3ページ取得する
      let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${SEARCH_RADIUS}&type=restaurant&key=${GOOGLE_MAPS_API_KEY}`;

      for (let i = 0; i < 3; i++) {
        if (i > 0) {
          if (!pageToken) break;
          // APIの推奨により、ページトークンを使用する前に2秒の遅延
          await new Promise((resolve) => setTimeout(resolve, 2000));
          url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${pageToken}&key=${GOOGLE_MAPS_API_KEY}`;
        }

        try {
          const response = await fetch(url);
          const responseText = await response.text();

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError: any) {
            console.error("JSON Parse Error:", parseError);
            console.error("Response Text:", responseText);
            throw new Error(`JSON Parse failed: ${parseError.message}`);
          }
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
            if (data.status === "REQUEST_DENIED") {
              setErrorMsg(
                `APIキー制限エラー: ${data.error_message || data.status}. GCPコンソールでAPIキーの制限設定を確認してください。`
              );
            } else {
              setErrorMsg(
                `検索APIエラー: ${data.status}. コンソールを確認してください。`
              );
            }
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

  useEffect(() => {
    // 位置情報のアクセス許可を取り、現在地情報を取得する
    const getCurrentLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("位置情報へのアクセスが拒否されました");
        setIsLoading(false);
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        // 1. マップの初期表示領域を設定
        setInitRegion({
          latitude: latitude,
          longitude: longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });

        // 2. 現在地情報を使用して飲食店情報を取得
        const placeMarkers = await fetchPlaces(latitude, longitude);
        setPlaces(placeMarkers);
      } catch (error) {
        console.error("現在地情報取得エラー：", error);
        setErrorMsg("現在地情報の取得中にエラーが発生しました。");
        setIsLoading(false);
      }
    };
    getCurrentLocation();
  }, [fetchPlaces]); // fetchPlacesを依存配列に追加

  // ★追加: モーダル内のお店の入るボタンのハンドラー
  const handleModalEnterStore = () => {
    if (selectedPlace) {
      // ここに選択されたお店ID (selectedPlace.id) を使った処理を追加できます
      setSelectedPlace(null); // モーダルを閉じる
      router.push(`/${selectedPlace?.id}/timer` as any); // メイン画面の「お店に入る」ボタンと同じアクション
    }
  };

  // ★更新: 詳細情報表示用モーダルコンポーネント
  const renderPlaceModal = () => {
    if (!selectedPlace) return null;

    const photoUrl = selectedPlace.photoReference
      ? getPhotoUrl(selectedPlace.photoReference)
      : null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedPlace}
        onRequestClose={() => setSelectedPlace(null)} // Androidの戻るボタン対応
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

            {/* 写真の表示 */}
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

            {/* お店に入るボタン (下部に大きく配置) */}
            <TouchableOpacity
              style={styles.enterStoreButton}
              onPress={handleModalEnterStore}
            >
              <Text style={styles.enterButtonText}>お店に入る</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

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
                pinColor="blue" // 飲食店マーカーは青色に設定
                onPress={() => handleMarkerPress(place)} // ★追加: タップ時の処理
              />
            ))}
          </MapView>
        )}

        {/* ローディングインジケーター */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
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
    justifyContent: "flex-end", // 画面の下から表示
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: colors.modal.background,
    padding: 20,
    paddingTop: 40, // Xボタンのためのスペースを確保
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
    maxHeight: "75%",
    position: "relative", // Xボタンを絶対配置するために必要
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
    backgroundColor: colors.button.secondary + "33", // 薄いグレー
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
