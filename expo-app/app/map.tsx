import { useEffect, useState, useCallback, useRef } from "react";
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
import MapView, { Marker, Region, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { fetch } from "expo/fetch";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import CustomMarker from "../components/CustomMarker";
import PulseCircle from "../components/PulseCircle";
import { ReviewedStoresManager } from "../utils/reviewedStores";

// ★★★ ここにあなたのGoogle Maps APIキーを挿入してください ★★★
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAP_API_KEY;
const SEARCH_RADIUS = 5000; // 検索半径 (メートル)
const SEARCH_RADII = [2000, 5000, 10000]; // 段階的検索用の半径リスト
const MAX_REVIEW_COUNT = 50; // ★レビュー数の上限 (50件以下をフィルタリング)★
const ENTER_RADIUS_METER = 50; // 入店可能な半径 (メートル)

// 新しいPlaces API (New)用の設定
const NEW_API_BASE_URL = "https://places.googleapis.com/v1/places:searchNearby";
// 新APIで有効なタイプのみを使用
const FOOD_TYPES = ["restaurant", "cafe", "bar", "bakery"];
const MAX_RESULTS_PER_REQUEST = 20; // 新APIの最大値

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

// 経路データの型定義
type RouteData = {
  coordinates: Array<{
    latitude: number;
    longitude: number;
  }>;
  distance: string;
  duration: string;
  steps: Array<{
    instruction: string;
    distance: string;
    duration: string;
  }>;
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

/**
 * 2点間の方位角を計算します（北を0度とする）
 * @param lat1 現在地の緯度
 * @param lon1 現在地の経度
 * @param lat2 目的地の緯度
 * @param lon2 目的地の経度
 * @returns 方位角 (0-360度)
 */
const getBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  let bearing = Math.atan2(y, x) * (180 / Math.PI);

  // 0-360度の範囲に正規化
  bearing = (bearing + 360) % 360;

  return bearing;
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
  const [isStoreReviewed, setIsStoreReviewed] = useState<boolean>(false);

  // 🌟 レビュー済み店舗のIDを管理するステート 🌟
  const [reviewedStoreIds, setReviewedStoreIds] = useState<Set<string>>(
    new Set()
  );

  // 🌟 ユーザーの現在地を保持するステートを追加 🌟
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // 🌟 経路モード用の動的region管理 🌟
  const [routeRegion, setRouteRegion] = useState<Region | null>(null);

  // 🌟 経路表示関連のstate追加 🌟
  const [isRouteMode, setIsRouteMode] = useState<boolean>(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [routeTargetPlace, setRouteTargetPlace] = useState<PlaceMarker | null>(
    null
  );

  // 🌟 コンパス機能関連のstate追加 🌟
  const [heading, setHeading] = useState<number>(0);
  const [magnetometerSubscription, setMagnetometerSubscription] =
    useState<any>(null);

  // 🌟 スムージング用の前回の角度を保存 🌟
  const [lastHeading, setLastHeading] = useState<number>(0);

  // 🌟 MapViewのref追加 🌟
  const mapRef = useRef<MapView>(null);

  // 🌟 経路方向計算用の関数 🌟
  const getRouteDirection = useCallback(() => {
    if (!location || !routeTargetPlace) {
      return null;
    }

    // 現在地から目的地への直線方位角を計算
    const bearing = getBearing(
      location.latitude,
      location.longitude,
      routeTargetPlace.latitude,
      routeTargetPlace.longitude
    );

    console.log(
      `経路方向: 現在地(${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}) → 目的地(${routeTargetPlace.latitude.toFixed(4)}, ${routeTargetPlace.longitude.toFixed(4)}) = ${bearing.toFixed(1)}°`
    );

    return bearing;
  }, [location, routeTargetPlace]);

  // Places API (New)用の写真URL生成関数
  const getPhotoUrl = (photoName: string) => {
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${GOOGLE_MAPS_API_KEY}`;
  };

  // 🌟 経路方向コンパス機能: 目的地方向に地図を向ける 🌟
  const startRouteCompass = useCallback(() => {
    console.log("経路方向コンパス開始");

    // 🌟 定期的に経路方向を更新する間隔を設定 🌟
    const updateInterval = setInterval(() => {
      if (isRouteMode && location && routeTargetPlace && mapRef.current) {
        const routeDirection = getRouteDirection();

        if (routeDirection !== null) {
          console.log(`地図を経路方向${routeDirection.toFixed(1)}°に向ける...`);

          // animateCameraを使用して地図を経路方向に向ける
          mapRef.current.animateCamera(
            {
              center: {
                latitude: location.latitude,
                longitude: location.longitude,
              },
              heading: routeDirection, // 経路方向を設定
              pitch: 0, // 傾きは0
              zoom: 17, // ズームレベル（経路表示に適した値）
            },
            { duration: 1000 }
          ); // 1秒でスムーズにアニメーション

          setHeading(routeDirection);
        }
      }
    }, 2000); // 2秒間隔で更新

    setMagnetometerSubscription(updateInterval);
  }, [isRouteMode, location, routeTargetPlace, getRouteDirection]);

  // 🌟 経路コンパス機能を停止 🌟
  const stopCompass = useCallback(() => {
    if (magnetometerSubscription) {
      console.log("経路方向コンパス停止");
      clearInterval(magnetometerSubscription);
      setMagnetometerSubscription(null);
    }
  }, [magnetometerSubscription]);

  // Google Directions APIを使用した経路取得関数
  const fetchRoute = useCallback(
    async (destination: PlaceMarker) => {
      if (!location || !GOOGLE_MAPS_API_KEY) return;

      setIsLoadingRoute(true);

      const origin = `${location.latitude},${location.longitude}`;
      const dest = `${destination.latitude},${destination.longitude}`;

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&mode=walking&key=${GOOGLE_MAPS_API_KEY}`
        );

        const data = await response.json();

        if (data.status === "OK" && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0];

          // Polyline用の座標データを変換
          const coordinates = decodePolyline(route.overview_polyline.points);

          setRouteData({
            coordinates,
            distance: leg.distance.text,
            duration: leg.duration.text,
            steps: leg.steps.map((step: any) => ({
              instruction: step.html_instructions.replace(/<[^>]*>/g, ""),
              distance: step.distance.text,
              duration: step.duration.text,
            })),
          });
        }
      } catch (error) {
        console.error("経路取得エラー:", error);
        Alert.alert("エラー", "経路情報の取得に失敗しました。");
      } finally {
        setIsLoadingRoute(false);
      }
    },
    [location]
  );

  // Polyline文字列をデコードする関数
  const decodePolyline = (polyline: string) => {
    const coordinates: Array<{ latitude: number; longitude: number }> = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < polyline.length) {
      let shift = 0;
      let result = 0;
      let byte;

      do {
        byte = polyline.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      shift = 0;
      result = 0;

      do {
        byte = polyline.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      coordinates.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return coordinates;
  };

  // 経路表示モードの開始
  const handleShowRoute = async () => {
    if (!selectedPlace) return;

    // 🌟 経路対象の店舗を保存 🌟
    setRouteTargetPlace(selectedPlace);
    await fetchRoute(selectedPlace);
    setIsRouteMode(true);

    // 🌟 経路モード開始時に地図を経路方向に向ける 🌟
    if (location && mapRef.current) {
      console.log("経路モード開始 - 経路方向に地図を向ける");

      // 🌟 経路方向を計算して地図を向ける 🌟
      const routeDirection = getRouteDirection();
      if (routeDirection !== null) {
        console.log(
          `初期設定: 地図を経路方向${routeDirection.toFixed(1)}°に向ける`
        );

        mapRef.current.animateCamera(
          {
            center: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
            heading: routeDirection, // 経路方向に設定
            pitch: 0,
            zoom: 17,
          },
          { duration: 2000 }
        );
      } else {
        // フォールバック: 経路方向が計算できない場合は北向き
        mapRef.current.animateCamera(
          {
            center: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
            heading: 0, // 北向き
            pitch: 0,
            zoom: 17,
          },
          { duration: 1000 }
        );
      }
    }

    // 🌟 経路方向コンパス機能を開始 🌟
    startRouteCompass();

    // 🌟 経路表示後にモーダルを閉じる 🌟
    setSelectedPlace(null);
  };

  // 経路表示モードの終了
  const handleExitRouteMode = () => {
    setIsRouteMode(false);
    setRouteData(null);
    setRouteTargetPlace(null);

    // 🌟 コンパス機能を停止 🌟
    stopCompass();

    // 🌟 地図を元の表示に戻す 🌟
    if (initRegion && mapRef.current) {
      mapRef.current.animateCamera(
        {
          center: {
            latitude: initRegion.latitude,
            longitude: initRegion.longitude,
          },
          heading: 0, // 北向きに戻す
          pitch: 0,
          zoom: 15, // 通常のズームレベル
        },
        { duration: 1000 }
      );
    }

    // 🌟 方位角とrouteRegionをリセット 🌟
    setHeading(0);
    setRouteRegion(null);
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

  // マーカーがタップされたときのハンドラー
  const handleMarkerPress = async (place: PlaceMarker) => {
    setSelectedPlace(place);
    // レビュー済みかどうかをチェック
    const reviewed = await ReviewedStoresManager.isStoreReviewed(place.id);
    setIsStoreReviewed(reviewed);

    // 🌟 レビュー済み状態が変更されている場合は、ステートも更新 🌟
    if (reviewed && !reviewedStoreIds.has(place.id)) {
      setReviewedStoreIds((prev) => new Set([...prev, place.id]));
    }
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

        // 🌟 4. 各店舗のレビュー済み状態をチェック 🌟
        const reviewedIds = new Set<string>();
        for (const place of placeMarkers) {
          const isReviewed = await ReviewedStoresManager.isStoreReviewed(
            place.id
          );
          if (isReviewed) {
            reviewedIds.add(place.id);
          }
        }
        setReviewedStoreIds(reviewedIds);
      } catch (error) {
        console.error("現在地情報取得エラー：", error);
        setErrorMsg("現在地情報の取得中にエラーが発生しました。");
      } finally {
        setIsLoading(false);
      }
    };
    getCurrentLocation();
  }, [fetchAllPlaces]);

  // 🌟 コンポーネントアンマウント時のクリーンアップ 🌟
  useEffect(() => {
    return () => {
      // コンポーネントがアンマウントされる際にコンパス機能を停止
      stopCompass();
    };
  }, [stopCompass]);

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

  // 星の表示を生成する関数
  const renderStars = (rating: string) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let stars = "";

    // 満点の星（黄色い星）
    for (let i = 0; i < fullStars; i++) {
      stars += "★";
    }

    // 半星（0.5以上の場合）
    if (hasHalfStar) {
      stars += "★"; // 視覚的に分かりやすくするため満点星を使用
    }

    // 空の星（グレーの星）
    for (let i = 0; i < emptyStars; i++) {
      stars += "☆";
    }

    return stars;
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
        animationType="slide"
        transparent={true}
        visible={!!selectedPlace}
        onRequestClose={() => {
          setSelectedPlace(null);
          handleExitRouteMode();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* ハンドルバー */}
            <View style={styles.modalHandle} />

            {/* 閉じるボタン */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedPlace(null)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>

            {/* 店舗画像とタイトル */}
            <View style={styles.storeImageContainer}>
              {photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.noImageText}>写真はありません</Text>
                </View>
              )}
              <View style={styles.imageOverlay}>
                <Text style={styles.modalTitle}>{selectedPlace.title}</Text>
                <Text style={styles.modalSubtitle}>
                  {isStoreReviewed ? "レビュー済み" : "未開拓店舗"}
                </Text>
              </View>
            </View>

            {/* 評価と距離情報 */}
            <View style={styles.infoRow}>
              <View style={styles.ratingContainer}>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStars}>
                    {renderStars(
                      selectedPlace.description.match(/評価: ([\d.]+)/)?.[1] ||
                        "0"
                    )}
                  </Text>
                  <Text style={styles.ratingText}>
                    {selectedPlace.description.match(/評価: ([\d.]+)/)?.[1] ||
                      "なし"}
                  </Text>
                </View>
                <Text style={styles.reviewCountText}>
                  レビュー
                  {selectedPlace.description.match(
                    /レビュー数: (\d+)件/
                  )?.[1] || "0"}
                  件
                </Text>
              </View>
              <View style={styles.distanceContainer}>
                <Text style={styles.walkIcon}>🚶</Text>
                <Text style={styles.distanceText}>{distanceMessage}</Text>
              </View>
            </View>

            {/* レビュー済みメッセージまたは入店・経路ボタン */}
            {isStoreReviewed ? (
              <View style={styles.reviewedContainer}>
                <Text style={styles.reviewedMessage}>
                  このお店はすでにレビュー済みです
                </Text>
                <Text style={styles.reviewedSubMessage}>
                  ご協力ありがとうございました！
                </Text>
              </View>
            ) : !isRouteMode ? (
              <>
                {/* 通常モード: 入店ボタンと経路表示ボタン */}
                <TouchableOpacity
                  style={[
                    styles.premiumButton,
                    isEnterButtonDisabled && styles.disabledButton,
                  ]}
                  onPress={handleModalEnterStore}
                  disabled={isEnterButtonDisabled}
                >
                  <Text style={styles.premiumButtonText}>
                    {isEnterButtonDisabled ? "入店不可" : "入店"}
                  </Text>
                </TouchableOpacity>

                {/* 経路表示ボタン */}
                <TouchableOpacity
                  style={[styles.routeButton]}
                  onPress={handleShowRoute}
                  disabled={isLoadingRoute}
                >
                  <Text style={styles.routeButtonText}>
                    {isLoadingRoute ? "経路を取得中..." : "経路を表示"}
                  </Text>
                </TouchableOpacity>

                {isEnterButtonDisabled && (
                  <Text style={styles.enterDisabledMessage}>
                    入店するには{ENTER_RADIUS_METER}m以内に移動してください
                  </Text>
                )}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    );
  };

  // ... (return内のコンポーネントは変更なし) ...
  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            レビュー{MAX_REVIEW_COUNT}件未満の店舗を探索中
          </Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/profile" as any)}
          >
            <View style={styles.profileIcon}>
              <Text style={styles.profileIconText}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {errorMsg ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : (
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            style={styles.mapContainer}
            // 🌟 経路モード時はregionを無効にしてanimateCameraに任せる 🌟
            region={!isRouteMode ? initRegion || undefined : undefined}
            showsUserLocation={true}
            provider="google"
            // マップが完全にロードされるまで、initRegionがnullの場合は表示しない
            initialRegion={initRegion || undefined}
            // 🌟 経路モード時はコンパス機能を有効化 🌟
            showsCompass={isRouteMode}
            rotateEnabled={true}
            // 🌟 経路モード時はユーザーの現在地に追従しない（animateCameraで制御） 🌟
            followsUserLocation={false}
            showsMyLocationButton={isRouteMode}
            // 🌟 より詳細なコントロール 🌟
            scrollEnabled={true}
            zoomEnabled={true}
            pitchEnabled={true}
          >
            {/* 取得した飲食店マーカーの描画 */}
            {places
              .filter((place) => {
                // 🌟 経路モード時は目的地のみ表示 🌟
                if (isRouteMode && routeTargetPlace) {
                  return place.id === routeTargetPlace.id;
                }
                // 通常モード時はすべて表示
                if (!isRouteMode) {
                  return true;
                }
                // 経路モードだがrouteTargetPlaceがない場合は非表示
                return false;
              })
              .map((place) => {
                // レビュー数を取得（description文字列から抽出）
                const reviewMatch =
                  place.description.match(/レビュー数: (\d+)件/);
                const reviewCount = reviewMatch
                  ? parseInt(reviewMatch[1], 10)
                  : 0;

                // 🌟 ユーザーの現在地からの距離を計算してマーカーの色を決定 🌟
                let markerColor: string | undefined = undefined;
                if (location) {
                  const distance = getDistance(
                    location.latitude,
                    location.longitude,
                    place.latitude,
                    place.longitude
                  );
                  // ENTER_RADIUS_METER以内の場合、色を#F7931Eに変更
                  if (distance <= ENTER_RADIUS_METER) {
                    markerColor = "#F7931E";
                  }
                }

                // 🌟 レビュー済み状態を取得 🌟
                const isReviewed = reviewedStoreIds.has(place.id);

                return (
                  <Marker
                    key={`marker-${place.id}`}
                    coordinate={{
                      latitude: place.latitude,
                      longitude: place.longitude,
                    }}
                    onPress={() => handleMarkerPress(place)}
                  >
                    <CustomMarker
                      reviewCount={reviewCount}
                      colorOverride={markerColor}
                      isReviewed={isReviewed}
                    />
                  </Marker>
                );
              })}

            {/* 🌟 経路のPolyline表示 🌟 */}
            {isRouteMode && routeData && (
              <Polyline
                coordinates={routeData.coordinates}
                strokeColor="#4A90E2"
                strokeWidth={4}
                lineDashPattern={[5, 5]}
              />
            )}
          </MapView>

          {/* パルスアニメーション（現在地の周辺範囲表示） - 軽減版 */}
          {location && (
            <View style={styles.pulseContainer}>
              <PulseCircle size={200} duration={4000} />
            </View>
          )}

          {/* 周辺統計情報のフローティングカード */}
          <View style={styles.statsCard}>
            <Text style={styles.statsText}>
              周辺の未開拓店舗:{" "}
              <Text style={styles.statsNumber}>{places.length}</Text>件
            </Text>
          </View>

          {/* 🌟 経路モード終了ボタン 🌟 */}
          {isRouteMode && (
            <View style={styles.routeExitContainer}>
              {/* 経路情報表示 */}
              {routeData && (
                <View style={styles.routeInfoFloatingCard}>
                  <Text style={styles.routeInfoFloatingText}>
                    🚶 徒歩 {routeData.duration} ({routeData.distance})
                  </Text>
                </View>
              )}

              {/* 経路終了ボタン */}
              <TouchableOpacity
                style={styles.routeExitButton}
                onPress={handleExitRouteMode}
              >
                <Text style={styles.routeExitButtonText}>経路表示を終了</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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

      {!isLoading && !errorMsg && places.length === 0 && initRegion && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>
            レビュー50件以下の飲食店は見つかりませんでした。
          </Text>
        </View>
      )}

      {/* ★追加: 詳細モーダルを表示★ */}
      {renderPlaceModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ヘッダー関連
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 20,
  },
  headerContent: {
    backgroundColor: "rgba(74, 144, 226, 0.95)", // より不透明に
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    ...typography.body,
    fontWeight: "bold",
    color: colors.text.white,
    textShadowColor: "rgba(255, 255, 255, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    flex: 1,
  },
  headerCount: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text.white,
  },
  profileButton: {
    marginLeft: 12,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.explorer.primary,
    shadowColor: colors.explorer.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 8,
  },
  profileIconText: {
    fontSize: 20,
    color: colors.text.white,
  },

  // マップ関連
  mapWrapper: {
    flex: 1,
    position: "relative",
  },
  mapContainer: {
    flex: 1,
    zIndex: 0, // ベースレイヤー
  },
  pulseContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none", // タッチイベントを透過
    zIndex: 1, // マップより上だが、他のUIより下に
  },

  // 統計カード
  statsCard: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
    width: 300,
    backgroundColor: "rgba(255, 255, 255, 0.95)", // より不透明に
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center", // 上下中央揃え
    minHeight: 50, // 最小高さを設定
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10, // ヘッダーより下だが、マップより上
  },
  statsText: {
    ...typography.body,
    fontWeight: "bold",
    color: colors.explorer.textLightPrimary,
  },
  statsNumber: {
    color: colors.explorer.primary,
    fontSize: 18,
  },

  // エラー・ローディング
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

  // モーダル関連
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    backgroundColor: colors.explorer.surfaceLight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    maxHeight: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  modalHandle: {
    width: 48,
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 16,
  },

  // 店舗画像とタイトル
  storeImageContainer: {
    position: "relative",
    height: 192,
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    color: colors.text.secondary,
    ...typography.body,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 16,
  },
  modalTitle: {
    ...typography.heading,
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text.white,
    marginBottom: 4,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.text.white,
    fontSize: 14,
  },

  // 閉じるボタン
  closeButton: {
    position: "absolute",
    top: 10,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text.secondary,
    lineHeight: 20,
  },

  // 評価と距離
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // 上揃えに変更
    marginHorizontal: 16,
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingStars: {
    fontSize: 16,
    marginRight: 8,
    color: "#FFD700", // 黄色い星
  },
  ratingText: {
    ...typography.body,
    fontWeight: "bold",
    color: colors.explorer.textLightPrimary,
  },
  reviewCountText: {
    ...typography.caption,
    color: colors.explorer.textLightSecondary,
    fontSize: 12,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  walkIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  distanceText: {
    ...typography.caption,
    color: colors.explorer.textLightSecondary,
    fontWeight: "500",
  },

  // プレミアムボタン
  premiumButton: {
    marginHorizontal: 16,
    backgroundColor: colors.explorer.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: colors.explorer.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  premiumButtonText: {
    ...typography.button,
    color: colors.text.white,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: colors.button.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  enterDisabledMessage: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: 8,
    marginHorizontal: 16,
    fontSize: 12,
  },

  // レビュー済み表示
  reviewedContainer: {
    marginHorizontal: 16,
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  reviewedMessage: {
    ...typography.body,
    color: colors.text.white,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  reviewedSubMessage: {
    ...typography.caption,
    color: colors.text.white,
    textAlign: "center",
    opacity: 0.9,
  },

  // 経路表示関連のスタイル
  routeButton: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  routeButtonText: {
    ...typography.button,
    color: colors.text.white,
    fontWeight: "600",
  },
  routeInfoContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4A90E2",
  },
  routeInfoTitle: {
    ...typography.heading,
    fontWeight: "bold",
    marginBottom: 8,
    color: colors.text.primary,
  },
  routeInfoText: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 16,
  },
  exitRouteButton: {
    marginHorizontal: 16,
    backgroundColor: colors.text.secondary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  exitRouteButtonText: {
    ...typography.button,
    color: colors.text.white,
    fontWeight: "600",
  },

  // 🌟 新しい経路終了ボタンのスタイル 🌟
  routeExitContainer: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 15,
  },
  routeInfoFloatingCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  routeInfoFloatingText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.text.primary,
    textAlign: "center",
  },
  routeExitButton: {
    backgroundColor: "#F7931E", // オレンジ色
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 200,
    alignItems: "center",
    shadowColor: "#F7931E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  routeExitButtonText: {
    ...typography.button,
    color: colors.text.white,
    fontWeight: "bold",
    fontSize: 16,
  },
});
