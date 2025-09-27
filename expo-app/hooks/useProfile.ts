import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  UserProfile,
  ReviewData,
  PROFILE_STORAGE_KEYS,
} from "../types/profile";

const DEFAULT_PROFILE: UserProfile = {
  username: "探求者",
  joinDate: new Date().toISOString(),
  totalReviews: 0,
  totalKompeito: 0,
  reviewedStores: 0,
  monthlyReviews: 0,
  lastMonthReset: new Date().toISOString(),
};

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  // プロフィールデータの読み込み
  const loadProfile = useCallback(async () => {
    try {
      const storedProfile = await AsyncStorage.getItem(
        PROFILE_STORAGE_KEYS.USER_PROFILE
      );
      if (storedProfile) {
        const parsedProfile: UserProfile = JSON.parse(storedProfile);

        // 月が変わっていたら月次データをリセット
        const now = new Date();
        const lastReset = new Date(parsedProfile.lastMonthReset);

        if (
          now.getMonth() !== lastReset.getMonth() ||
          now.getFullYear() !== lastReset.getFullYear()
        ) {
          parsedProfile.monthlyReviews = 0;
          parsedProfile.lastMonthReset = now.toISOString();
          await saveProfile(parsedProfile);
        }

        setProfile(parsedProfile);
      } else {
        // 初回起動時のデフォルトプロフィールを保存
        await saveProfile(DEFAULT_PROFILE);
        setProfile(DEFAULT_PROFILE);
      }
    } catch (error) {
      console.error("プロフィール読み込みエラー:", error);
      setProfile(DEFAULT_PROFILE);
    } finally {
      setLoading(false);
    }
  }, []);

  // プロフィールデータの保存
  const saveProfile = useCallback(async (newProfile: UserProfile) => {
    try {
      await AsyncStorage.setItem(
        PROFILE_STORAGE_KEYS.USER_PROFILE,
        JSON.stringify(newProfile)
      );
      setProfile(newProfile);
    } catch (error) {
      console.error("プロフィール保存エラー:", error);
    }
  }, []);

  // レビュー投稿時の統計更新
  const addReview = useCallback(
    async (storeId: string, kompeito: number = 10) => {
      try {
        // レビューデータの保存
        const reviewData: ReviewData = {
          storeId,
          reviewId: `review_${Date.now()}`,
          timestamp: new Date().toISOString(),
          kompeito,
        };

        // 既存のレビューデータを取得
        const existingReviewsData = await AsyncStorage.getItem(
          PROFILE_STORAGE_KEYS.REVIEWS_DATA
        );
        const reviews: ReviewData[] = existingReviewsData
          ? JSON.parse(existingReviewsData)
          : [];
        reviews.push(reviewData);
        await AsyncStorage.setItem(
          PROFILE_STORAGE_KEYS.REVIEWS_DATA,
          JSON.stringify(reviews)
        );

        // レビューした店舗のセットを更新
        const existingStoresData = await AsyncStorage.getItem(
          PROFILE_STORAGE_KEYS.REVIEWED_STORES
        );
        const reviewedStores: Set<string> = new Set(
          existingStoresData ? JSON.parse(existingStoresData) : []
        );
        reviewedStores.add(storeId);
        await AsyncStorage.setItem(
          PROFILE_STORAGE_KEYS.REVIEWED_STORES,
          JSON.stringify([...reviewedStores])
        );

        // プロフィール統計を更新
        const updatedProfile: UserProfile = {
          ...profile,
          totalReviews: profile.totalReviews + 1,
          totalKompeito: profile.totalKompeito + kompeito,
          reviewedStores: reviewedStores.size,
          monthlyReviews: profile.monthlyReviews + 1,
        };

        await saveProfile(updatedProfile);
      } catch (error) {
        console.error("レビュー追加エラー:", error);
      }
    },
    [profile, saveProfile]
  );

  // 統計データのリセット（開発用）
  const resetStats = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        PROFILE_STORAGE_KEYS.USER_PROFILE,
        PROFILE_STORAGE_KEYS.REVIEWS_DATA,
        PROFILE_STORAGE_KEYS.REVIEWED_STORES,
      ]);
      await loadProfile();
    } catch (error) {
      console.error("統計リセットエラー:", error);
    }
  }, [loadProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    addReview,
    resetStats,
    refreshProfile: loadProfile,
  };
};
