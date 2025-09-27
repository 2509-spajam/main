import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";

export default function Review() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewed, setReviewed] = useState(false); // Googleレビュー済み状態

  // Googleレビュー投稿ページに遷移する
  const handleGoogleReview = () => {
    const placeId = "ChIJ1_DZbAD1QDURze897ZGTrdU";
    const url = `https://search.google.com/local/writereview?placeid=${placeId}`;
    Linking.openURL(url);
    setReviewed(true); // 遷移したらレビュー済みとみなす
  };

  const handleSubmitReview = () => {
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

  return (
    <ScrollView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerText}>レビューを書く</Text>
      </View>

      <View style={styles.content}>
        {/* 店舗情報 */}
        <View style={styles.storeInfoContainer}>
          <View style={styles.storeIcon}>
            <Text style={styles.storeIconText}>🏪</Text>
          </View>
          <Text style={styles.storeName}>ほげふが店</Text>
        </View>

        {/* 説明文 */}
        <Text
          style={{
            ...typography.body,
            color: colors.text.secondary,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          Googleのレビュー投稿ページに遷移します。投稿後「次へ」ボタンが有効になります。
        </Text>

        {/* 感謝メッセージ（レビュー済みの場合のみ表示） */}
        {reviewed && (
          <Text style={styles.thankYouText}>ご協力ありがとうございます！</Text>
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
          <Text style={styles.googleReviewButtonText}>
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
          <Text style={styles.submitButtonText}>次へ</Text>
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
});
