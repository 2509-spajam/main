# GLBモデルを使用したこんぺいとうシステム実装計画

## 目的
準備された `conpeito.glb` 3Dモデルを使用して、よりリアルなこんぺいとう表示システムを実装

## 現在の環境分析
- ✅ **GLBファイル**: `expo-app/assets/objs/conpeito.glb` 配置済み
- ✅ **Metro設定**: `.glb` アセット対応済み
- ✅ **Three.js環境**: expo-three 8.0.0, three.js 0.166.1
- ✅ **既存コンポーネント**: CompeitoJar.tsx（基本版）

## 実装計画

### Phase 1: GLBローダー統合
1. **GLTFLoaderの追加**
   ```bash
   # 追加ライブラリ（既存環境で対応可能か確認）
   # Three.js GLTFLoader はコア機能なので追加不要の可能性
   ```

2. **GLBCompeitoLoaderコンポーネント作成**
   - GLBファイル読み込み
   - モデルキャッシュ機能
   - エラーハンドリング

### Phase 2: GLBこんぺいとうビンコンポーネント
1. **GLBCompeitoJar.tsx 作成**
   - 既存のCompeitoJar.tsxをベースに改良
   - OctahedronGeometry → GLBモデルに変更
   - パフォーマンス最適化

2. **主な機能**
   ```typescript
   interface GLBCompeitoJarProps {
     count: number;
     glbPath: string;              // GLBファイルパス
     size?: 'small' | 'medium' | 'large';
     animated?: boolean;
     interactive?: boolean;         // タッチ追加機能
     style?: any;
     showCount?: boolean;
     onCompeitoAdd?: (newCount: number) => void;
   }
   ```

### Phase 3: GLBモデル最適化
1. **インスタンス化**
   - 単一GLBモデルを複数インスタンス表示
   - InstancedMeshでパフォーマンス向上

2. **LOD (Level of Detail)**
   - 距離に応じてモデル詳細度調整
   - フレームレート安定化

### Phase 4: アニメーション強化
1. **GLBアニメーション**
   - モデル内蔵アニメーション対応
   - 個別こんぺいとうの微細な動き

2. **物理演算統合** (オプション)
   - より自然な落下・跳ね返り
   - GLBモデルの境界ボックス使用

## 技術的実装詳細

### GLBローダー実装
```typescript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

class GLBModelCache {
  private static cache = new Map<string, THREE.Group>();
  
  static async loadModel(path: string): Promise<THREE.Group> {
    if (this.cache.has(path)) {
      return this.cache.get(path)!.clone();
    }
    
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(path);
    this.cache.set(path, gltf.scene);
    return gltf.scene.clone();
  }
}
```

### GLBインスタンス化システム
```typescript
// 効率的なGLBインスタンス表示
const createGLBInstancedMesh = (model: THREE.Group, count: number) => {
  // GLBメッシュを解析してInstancedMeshに変換
  const geometry = extractGeometryFromGLB(model);
  const material = extractMaterialFromGLB(model);
  
  return new THREE.InstancedMesh(geometry, material, count);
};
```

### アセット管理
```
expo-app/assets/
├── objs/
│   └── conpeito.glb          # メインこんぺいとうモデル
└── 3d/                       # 新規ディレクトリ
    ├── textures/             # テクスチャファイル
    └── materials/            # マテリアル設定
```

## パフォーマンス考慮事項

### メモリ使用量
- **GLBファイルサイズ**: 目標 < 1MB
- **インスタンス数**: 最大100個まで対応
- **テクスチャ解像度**: 512x512px推奨

### 読み込み速度
- **キャッシュ機能**: 初回読み込み後はメモリキャッシュ
- **プリロード**: アプリ起動時にバックグラウンド読み込み
- **フォールバック**: 読み込み失敗時はOctahedronで代替

### プラットフォーム対応
- **iOS/Android**: フル3D GLBモデル表示
- **Web**: パフォーマンスに応じて簡略化
- **低性能デバイス**: 自動的にLOD調整

## エラーハンドリング戦略

### GLB読み込み失敗
```typescript
const fallbackGeometry = {
  onError: () => new THREE.OctahedronGeometry(0.1, 0),
  onLoad: (glb) => extractGeometryFromGLB(glb)
};
```

### パフォーマンス低下
- フレームレート監視
- 自動品質調整
- こんぺいとう数動的制限

## 段階的実装スケジュール

### 実装順序
1. **GLTFLoader統合** (30分)
   - 基本的なGLB読み込み機能
   - エラーハンドリング

2. **GLBCompeitoJar作成** (60分)
   - 既存コンポーネント改良
   - GLBモデル統合

3. **インスタンス化最適化** (45分)
   - パフォーマンス向上
   - メモリ効率化

4. **UI統合** (15分)
   - reward.tsxでの使用
   - review.tsx予告表示

### テスト項目
- [ ] GLB読み込み成功
- [ ] 複数インスタンス表示
- [ ] タッチインタラクション
- [ ] パフォーマンス測定
- [ ] エラー処理確認

## 期待される効果

### ビジュアル向上
- 🎨 **リアルなこんぺいとう**: 実際の形状・質感
- ✨ **高品質レンダリング**: PBRマテリアル対応
- 🌟 **ブランド一貫性**: デザインシステム統合

### ユーザー体験
- 😊 **没入感向上**: 3Dモデルの魅力
- 🎮 **インタラクション強化**: タッチの楽しさ
- 📱 **アプリ差別化**: 独特なビジュアル

### 技術的メリット  
- 🚀 **拡張性**: 他の3Dアセット追加容易
- 🔧 **メンテナンス性**: モデル更新が独立
- 📊 **パフォーマンス**: 最適化されたレンダリング

## リスク・制約事項

### 技術的リスク
- **GLBファイルサイズ**: バンドルサイズ増加
- **読み込み時間**: 初回表示遅延の可能性
- **メモリ使用量**: デバイス依存のパフォーマンス差

### 対策
- GLBファイル最適化（Blender/glTF-Pipeline使用）
- プログレッシブローディング
- デバイス性能自動検出・調整

---

**次のアクション**: GLTFLoader統合とGLBCompeitoJar.tsxコンポーネント作成から開始

*計画作成日: 2025-09-27*  
*対象: conpeito.glb モデル統合*
- **ファイルパス**: `expo-app/app/index.tsx` (既存を更新)
- アプリタイトル「未評価レビュワーズ」
- アプリロゴ/アイコン表示
- 簡単な説明文
- 画面全体をタップしてマップ画面に遷移

### 2. マップ画面（メイン機能画面）
- **ファイルパス**: `expo-app/app/map.tsx`
- Google Map風の地図表示
- 現在地のアイコン表示
- お店の位置マーカー（ピン）表示
- 下部に「お店に入る」ボタン

### 3. タイマー画面
- **ファイルパス**: `expo-app/app/timer.tsx`
- 滞在チェック用のタイマー（00:00表示）
- お店の情報表示（店名、アイコン）
- 「お店を出る」ボタン

### 4. レビュー投稿画面
- **ファイルパス**: `expo-app/app/review.tsx`
- レビュー入力フォーム
- 星評価コンポーネント
- 投稿ボタン

### 5. コンペイトウ獲得画面
- **ファイルパス**: `expo-app/app/reward.tsx`
- 3Dアニメーション風のコンペイトウ表示
- 「もどる」ボタン

## 必要なコンポーネント

### 1. レイアウト設定
- **ファイルパス**: `expo-app/app/_layout.tsx` (既存を更新)
- スタックナビゲーション設定（タブナビゲーションは使わない）
- シンプルな画面遷移設定

### 2. 共通コンポーネント
- **ファイルパス**: `expo-app/components/StartScreen.tsx`
  - スタート画面のメインコンポーネント
- **ファイルパス**: `expo-app/components/MapView.tsx`
  - 地図表示のモック
- **ファイルパス**: `expo-app/components/StoreMarker.tsx`
  - お店のマーカーコンポーネント
- **ファイルパス**: `expo-app/components/Timer.tsx`
  - タイマー表示コンポーネント
- **ファイルパス**: `expo-app/components/ReviewForm.tsx`
  - レビューフォームコンポーネント
- **ファイルパス**: `expo-app/components/CompeitoAnimation.tsx`
  - コンペイトウアニメーションコンポーネント

### 3. モックデータ
- **ファイルパス**: `expo-app/data/mockStores.ts`
  - 店舗情報のモックデータ

### 4. スタイリング
- **ファイルパス**: `expo-app/styles/colors.ts`
  - アプリ共通のカラーパレット
- **ファイルパス**: `expo-app/styles/typography.ts`
  - フォントスタイル定義

## 実装順序

### Phase 1: 基本構造とスタート画面
1. スタックナビゲーション設定
2. スタート画面の実装（index.tsx）
3. 各画面のスケルトン作成
4. 基本的なナビゲーション動作（スタート→マップ）

### Phase 2: マップ画面
1. 地図のモック表示
2. お店マーカーの配置
3. 「お店に入る」ボタンの実装

### Phase 3: タイマー画面
1. タイマーUI実装（動作なし）
2. 店舗情報表示
3. 「お店を出る」ボタン

### Phase 4: レビュー・報酬画面
1. レビューフォーム
2. コンペイトウ表示画面
3. 画面遷移の最終調整

### Phase 5: スタイル調整
1. 全体のデザイン統一
2. アニメーション追加（簡易版）
3. レスポンシブ対応

## 必要な依存関係の追加予定
- `@react-navigation/stack` (画面遷移用)
- アニメーション用ライブラリ（react-native-reanimated は既に導入済み）

## 画面遷移フロー
1. **スタート画面** (index.tsx)
   ↓ タップ
2. **マップ画面** (map.tsx) 
   ↓ 「お店に入る」ボタン
3. **タイマー画面** (timer.tsx)
   ↓ 「お店を出る」ボタン  
4. **レビュー投稿画面** (review.tsx)
   ↓ レビュー投稿
5. **コンペイトウ獲得画面** (reward.tsx)
   ↓ 「もどる」ボタン
6. **マップ画面に戻る**

## 注意事項
- Google Maps API、Places API の機能は実装しない（モックのみ）
- タイマー機能は見た目のみ（実際のカウントダウンなし）
- レビュー投稿機能は画面遷移のみ
- 位置情報取得は実装しない
- データベース連携なし