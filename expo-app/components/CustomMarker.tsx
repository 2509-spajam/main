import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../styles/colors";

interface CustomMarkerProps {
  reviewCount: number;
  size?: number;
  colorOverride?: string; // 距離に基づいて色を変更するためのプロップ
}

const CustomMarker = React.memo(function CustomMarker({
  reviewCount,
  size = 36,
  colorOverride,
}: CustomMarkerProps) {
  // レビュー数に基づいてopacityを決定（レビューが少ないほど濃い）
  const getMarkerOpacity = (count: number): number => {
    if (count <= 10) return 1.0; // 最も未開拓（最も濃い）
    if (count <= 25) return 0.8; // 中程度
    if (count <= 40) return 0.6; // やや開拓済み
    return 0.4; // 上限近く（最も薄い）
  };

  const markerColor = colorOverride || colors.explorer.primary; // colorOverrideがあれば使用、なければ統一カラー
  const markerOpacity = getMarkerOpacity(reviewCount);

  return (
    <View style={[styles.container, { width: size, height: size * 1.5 }]}>
      {/* メインのピン部分 */}
      <View
        style={[
          styles.pin,
          {
            backgroundColor: markerColor,
            opacity: markerOpacity,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />
    </View>
  );
});

export default CustomMarker;

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
  },
  pin: {
    position: "absolute",
    top: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pinTip: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderStyle: "solid",
  },
  candy: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  candyInner: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
});
