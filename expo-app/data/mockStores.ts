export interface Store {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  reviewCount: number;
  averageRating: number;
  description?: string;
  imageUrl?: string;
}

export const mockStores: Store[] = [
  {
    id: '1',
    name: 'hogeU 総本店',
    latitude: 35.6762,
    longitude: 139.6503,
    reviewCount: 2,
    averageRating: 3.5,
    description: '未評価のカフェ。隠れた名店かも？',
    imageUrl: 'https://via.placeholder.com/100x100?text=hogeU'
  },
  {
    id: '2', 
    name: 'まちの小さな食堂',
    latitude: 35.6785,
    longitude: 139.6488,
    reviewCount: 0,
    averageRating: 0,
    description: '家庭的な雰囲気の食堂',
    imageUrl: 'https://via.placeholder.com/100x100?text=食堂'
  },
  {
    id: '3',
    name: '新規オープン書店',
    latitude: 35.6745,
    longitude: 139.6520,
    reviewCount: 1,
    averageRating: 4.0,
    description: '最近オープンした古本屋',
    imageUrl: 'https://via.placeholder.com/100x100?text=書店'
  }
];

export const getCurrentStore = (): Store => {
  // モックでは最初の店舗を返す
  return mockStores[0];
};