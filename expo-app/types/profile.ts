export interface UserProfile {
  username: string;
  joinDate: string; // ISO date string
  totalReviews: number;
  totalKompeito: number; // 獲得したコンペイトウ数
  reviewedStores: number; // レビューした店舗数（ユニークな店舗数）
  monthlyReviews: number; // 今月のレビュー数
  lastMonthReset: string; // 月次リセット用のISO date string
}

export interface ReviewData {
  storeId: string;
  reviewId: string;
  timestamp: string;
  kompeito: number; // そのレビューで獲得したコンペイトウ
}

export const PROFILE_STORAGE_KEYS = {
  USER_PROFILE: "user_profile",
  REVIEWS_DATA: "reviews_data",
  REVIEWED_STORES: "reviewed_stores", // Set<string>のJSON化
} as const;
