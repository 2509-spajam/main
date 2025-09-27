import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";

export default function Index() {
  const router = useRouter();

  const handleStartPress = () => {
    router.push("/map" as any);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleStartPress}>
      <View style={styles.content}>
        {/* アプリロゴ/アイコン */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* アプリタイトル */}
        <Text style={styles.title}>未評価レビュワーズ</Text>

        {/* 説明文 */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            まだ評価されていないお店を発見して{"\n"}
            レビューを書いてみよう！
          </Text>
          <Text style={styles.subdescription}>
            レビューを書くと{"\n"}
            「コンペイトウ」がもらえるよ 🍬
          </Text>
        </View>

        {/* タップして開始の案内 */}
        <View style={styles.tapHintContainer}>
          <Text style={styles.tapHint}>画面をタップして開始</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    ...typography.title,
    color: colors.primary,
    marginBottom: 24,
    textAlign: "center",
  },
  descriptionContainer: {
    marginBottom: 48,
    alignItems: "center",
  },
  description: {
    ...typography.body,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: 16,
  },
  subdescription: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: "center",
  },
  tapHintContainer: {
    position: "absolute",
    bottom: 64,
  },
  tapHint: {
    ...typography.caption,
    color: colors.text.light,
    textAlign: "center",
  },
});
