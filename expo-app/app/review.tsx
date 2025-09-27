import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { getCurrentStore } from "../data/mockStores";

export default function Review() {
  const router = useRouter();
  const store = getCurrentStore();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const handleSubmitReview = () => {
    // モックでは単純に報酬画面に遷移
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
        <Text style={styles.headerText}>お店を利用した、レビューを書く</Text>
      </View>

      <View style={styles.content}>
        {/* 店舗情報 */}
        <View style={styles.storeInfoContainer}>
          <View style={styles.storeIcon}>
            <Text style={styles.storeIconText}>🏪</Text>
          </View>
          <Text style={styles.storeName}>{store.name}</Text>
        </View>

        {/* 星評価 */}
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingLabel}>評価:</Text>
          <View style={styles.starsContainer}>{renderStars()}</View>
        </View>

        {/* レビューテキスト */}
        <View style={styles.reviewInputContainer}>
          <Text style={styles.reviewLabel}>レビュー:</Text>
          <TextInput
            style={styles.reviewInput}
            multiline
            numberOfLines={4}
            placeholder="お店の感想を書いてください..."
            placeholderTextColor={colors.text.light}
            value={reviewText}
            onChangeText={setReviewText}
          />
        </View>

        {/* 投稿ボタン */}
        <TouchableOpacity 
          style={[styles.submitButton, (!rating || !reviewText.trim()) && styles.submitButtonDisabled]} 
          onPress={handleSubmitReview}
          disabled={!rating || !reviewText.trim()}
        >
          <Text style={styles.submitButtonText}>レビューを投稿</Text>
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
});
