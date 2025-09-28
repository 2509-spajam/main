// 朝市食堂の店舗データ
// Google Maps URL: https://maps.google.com/maps/place/朝市食堂/@32.7828915,130.6758881,17z/

type MockStore = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  photoReference?: string;
  rating?: number;
  reviewCount?: number;
  category: string;
  address: string;
  googleMapsUrl?: string;
};

export const mockStores: MockStore[] = [
  {
    id: "ChIJuYFYieL0QDURTFtATaeYxTg",
    latitude: 32.7828915,
    longitude: 130.6758881,
    title: "朝市食堂",
    description: "熊本の美味しい定食屋。地元の新鮮な食材を使った家庭的な料理が自慢。",
    category: "定食屋",
    address: "熊本県熊本市",
    rating: 4.2,
    reviewCount: 28,
    googleMapsUrl: "https://maps.google.com/maps/place/朝市食堂/@32.7828915,130.6758881,17z/data=!4m10!1m2!2m1!1z5a6a6aOf5bGL!3m6!1s0x3540f4e2895881b9:0x38c598a74d405b4c!8m2!3d32.7828915!4d130.6758881!15sCgnlrprpo5_lsYtaDCIK5a6a6aOfIOWxi5IBIGNhc3VhbF9qYXBhbmVzZV9zdHlsZV9yZXN0YXVyYW50mgEkQ2hkRFNVaE5NRzluUzBWSlEwRm5TVVF0YVhORWVDMUJSUkFCqgFDEAEqDiIK5a6a6aOfIOWxiygIMh8QASIbBbboAiocci1dgB3gSfUL3qSziuJV6bZnQZFTMg4QAiIK5a6a6aOfIOWxi-ABAPoBBAhOEBM!16s%2Fg%2F1vc7_l6s?entry=ttu&g_ep=EgoyMDI1MDkyNC4wIKXMDSoASAFQAw%3D%3D",
  },
];

// PlaceMarker形式に変換する関数
export const convertToPlaceMarkers = (stores: MockStore[]) => {
  return stores.map(store => ({
    id: store.id,
    latitude: store.latitude,
    longitude: store.longitude,
    title: store.title,
    description: store.description,
    photoReference: store.photoReference,
  }));
};
