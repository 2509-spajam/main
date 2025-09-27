import AsyncStorage from "@react-native-async-storage/async-storage";

const REVIEWED_STORES_KEY = "reviewedStores";

/**
 * レビュー済みの店舗IDを管理するユーティリティ関数群
 */
export class ReviewedStoresManager {
  /**
   * レビュー済みの店舗IDリストを取得
   * @returns Promise<string[]> レビュー済みの店舗IDの配列
   */
  static async getReviewedStores(): Promise<string[]> {
    try {
      const reviewedStoresJson =
        await AsyncStorage.getItem(REVIEWED_STORES_KEY);
      if (reviewedStoresJson) {
        return JSON.parse(reviewedStoresJson);
      }
      return [];
    } catch (error) {
      console.error("レビュー済み店舗の取得に失敗しました:", error);
      return [];
    }
  }

  /**
   * 店舗IDをレビュー済みリストに追加
   * @param storeId 店舗ID
   * @returns Promise<boolean> 成功したかどうか
   */
  static async addReviewedStore(storeId: string): Promise<boolean> {
    try {
      const reviewedStores = await this.getReviewedStores();

      // 既に存在する場合は追加しない
      if (reviewedStores.includes(storeId)) {
        return true;
      }

      reviewedStores.push(storeId);
      await AsyncStorage.setItem(
        REVIEWED_STORES_KEY,
        JSON.stringify(reviewedStores)
      );
      console.log(`店舗ID ${storeId} をレビュー済みリストに追加しました`);
      return true;
    } catch (error) {
      console.error("レビュー済み店舗の追加に失敗しました:", error);
      return false;
    }
  }

  /**
   * 店舗がレビュー済みかどうかをチェック
   * @param storeId 店舗ID
   * @returns Promise<boolean> レビュー済みかどうか
   */
  static async isStoreReviewed(storeId: string): Promise<boolean> {
    try {
      const reviewedStores = await this.getReviewedStores();
      return reviewedStores.includes(storeId);
    } catch (error) {
      console.error("レビュー済み店舗のチェックに失敗しました:", error);
      return false;
    }
  }

  /**
   * レビュー済み店舗IDを削除（テスト用）
   * @param storeId 削除する店舗ID
   * @returns Promise<boolean> 成功したかどうか
   */
  static async removeReviewedStore(storeId: string): Promise<boolean> {
    try {
      const reviewedStores = await this.getReviewedStores();
      const updatedStores = reviewedStores.filter((id) => id !== storeId);
      await AsyncStorage.setItem(
        REVIEWED_STORES_KEY,
        JSON.stringify(updatedStores)
      );
      console.log(`店舗ID ${storeId} をレビュー済みリストから削除しました`);
      return true;
    } catch (error) {
      console.error("レビュー済み店舗の削除に失敗しました:", error);
      return false;
    }
  }

  /**
   * レビュー済み店舗リストをクリア（テスト用）
   * @returns Promise<boolean> 成功したかどうか
   */
  static async clearReviewedStores(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(REVIEWED_STORES_KEY);
      console.log("レビュー済み店舗リストをクリアしました");
      return true;
    } catch (error) {
      console.error("レビュー済み店舗リストのクリアに失敗しました:", error);
      return false;
    }
  }

  /**
   * レビュー済み店舗数を取得
   * @returns Promise<number> レビュー済み店舗数
   */
  static async getReviewedStoresCount(): Promise<number> {
    try {
      const reviewedStores = await this.getReviewedStores();
      return reviewedStores.length;
    } catch (error) {
      console.error("レビュー済み店舗数の取得に失敗しました:", error);
      return 0;
    }
  }
}
