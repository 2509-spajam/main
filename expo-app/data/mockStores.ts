export interface Store {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  reviewCount: number;
  averageRating: number;
  description?: string;
  imageUrl?: string;
  compeitoReward?: number; // レビュー投稿時にもらえるこんぺいとう数
}

// ユーザーのこんぺいとう管理
interface UserData {
  totalCompeitos: number;
  reviewedStores: string[];
}

let userData: UserData = {
  totalCompeitos: 0,
  reviewedStores: [],
};

export const mockStores: Store[] = [
  {
    id: "1",
    name: "hogeU 総本店",
    latitude: 35.6762,
    longitude: 139.6503,
    reviewCount: 2,
    averageRating: 3.5,
    description: "未評価のカフェ。隠れた名店かも？",
    imageUrl: "https://via.placeholder.com/100x100?text=hogeU",
    compeitoReward: 5, // レビューでこんぺいとう5個げっと
  },
  {
    id: "2",
    name: "まちの小さな食堂",
    latitude: 35.6785,
    longitude: 139.6488,
    reviewCount: 0,
    averageRating: 0,
    description: "家庭的な雰囲気の食堂",
    imageUrl: "https://via.placeholder.com/100x100?text=食堂",
    compeitoReward: 3, // こんぺいとう3個
  },
  {
    id: "3",
    name: "新規オープン書店",
    latitude: 35.6745,
    longitude: 139.652,
    reviewCount: 1,
    averageRating: 4.0,
    description: "最近オープンした古本屋",
    imageUrl: "https://via.placeholder.com/100x100?text=書店",
    compeitoReward: 4, // こんぺいとう4個
  },
];

export const getCurrentStore = (): Store => {
  // モックでは最初の店舗を返す
  return mockStores[0];
};

// ユーザーデータ管理関数
export const getUserData = (): UserData => {
  return userData;
};

export const addCompeitos = (count: number): void => {
  userData.totalCompeitos += count;
  console.log(`🍬 Added ${count} compeitos. Total: ${userData.totalCompeitos}`);
};

export const markStoreAsReviewed = (storeId: string): void => {
  if (!userData.reviewedStores.includes(storeId)) {
    userData.reviewedStores.push(storeId);
    console.log(`✅ Store ${storeId} marked as reviewed`);
  }
};

export const hasReviewedStore = (storeId: string): boolean => {
  return userData.reviewedStores.includes(storeId);
};

export const getCompeitoReward = (storeId: string): number => {
  const store = mockStores.find(s => s.id === storeId);
  return store?.compeitoReward || 1;
};
