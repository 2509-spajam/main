import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { SafeAreaView } from "react-native-safe-area-context";

// マーカーのデータ型
// 経度・緯度の情報と一意キー用のidで構成
type Marker = {
  id: number;
  latitude: number;
  longitude: number;
};

export default function MapSample() {
  const router = useRouter();

  // 現在地
  const [initRegion, setInitRegion] = useState<Region | null>(null);
  // エラーメッセージ
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // 位置情報のアクセス許可を取り、現在地情報を取得する
    const getCurrentLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("位置情報へのアクセスが拒否されました");
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({});
        // 緯度・経度はgetCurrentPositionAsyncで取得した緯度・経度
        // 緯度・経度の表示範囲の縮尺は固定値にしてます
        setInitRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch (error) {
        console.error("現在地情報取得エラー：", error);
      }
    };
    getCurrentLocation();
  }, []);

  const handleEnterStore = () => {
    router.push("/timer" as any);
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>未評価レビュワーズ</Text>
          </View>
          {errorMsg ? (
            <Text>{errorMsg}</Text>
          ) : (
            // MapViewではstyle設定は必須です。
            // （設定しないとMAP表示されません）
            // regionはinitRegion(Region型)を設定
            // showsUserLocationはtrueにすると、現在地が青い点で表示します。
            // providerをgoogleにするとiOSでもGoogleMapで表示してくれます。
            // （デフォルトはapple map）
            <MapView
              style={styles.mapContainer}
              region={initRegion || undefined}
              showsUserLocation={true}
              provider="google"
            ></MapView>
          )}

          {/* 下部ボタン */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={styles.enterButton}
              onPress={handleEnterStore}
            >
              <Text style={styles.enterButtonText}>お店に入る</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
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
    justifyContent: "center",
    alignItems: "center",
  },
  mapPlaceholder: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: "center",
  },
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
