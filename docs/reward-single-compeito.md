# Reward画面でのこんぺいとう単体表示計画

## 現状の問題

**reward.tsx**: 現在はGLBCompeitoJarコンポーネントを使用してビン全体を表示
- ビンも一緒に表示されてしまう
- 「コンペイトウGET！」の演出として、ビンは不要
- ゲットしたこんぺいとうだけを美しく単体表示したい

## 目標

**理想的なReward表示**:
- ビンなし、こんぺいとう単体のみ
- 1個のこんぺいとうを美しく表示
- 回転アニメーションで魅力的に
- パステルカラーでカラフルに

## 実装計画

### Phase 1: GLBCompeitoSingleコンポーネント作成

**新規コンポーネント**: `GLBCompeitoSingle.tsx`
- ビンなしでGLBこんぺいとうを単体表示
- 1個のこんぺいとうのみレンダリング
- パステルカラー適用
- 美しい回転アニメーション

### Phase 2: GLBCompeitoSingleの機能設計

**必要な機能**:
1. **GLBモデル読み込み**: 既存のloadGLBModel関数を再利用
2. **パステルカラー**: applyRandomPastelColor関数を再利用
3. **シンプルシーン**: ビンなし、こんぺいとう1個のみ
4. **美しいライティング**: こんぺいとうを美しく照らす
5. **回転アニメーション**: ゆっくり美しく回転

### Phase 3: reward.tsxの修正

**変更内容**:
- `GLBCompeitoJar` → `GLBCompeitoSingle`に置き換え
- propsを簡素化（countやinteractiveは不要）
- 単体表示に最適化

## コンポーネント設計

### GLBCompeitoSingle.tsx の構造

```typescript
interface GLBCompeitoSingleProps {
  size?: number;         // こんぺいとうのサイズ
  rotationSpeed?: number; // 回転速度
  color?: THREE.Color;   // 指定色（なしでランダム）
  style?: any;          // コンテナスタイル
}

export default function GLBCompeitoSingle({
  size = 0.5,           // ビンよりも大きく表示
  rotationSpeed = 0.02, // ゆっくり回転
  color,               // 色指定可能
  style
}: GLBCompeitoSingleProps)
```

## 実装タスク

### Task 1: GLBCompeitoSingleコンポーネント作成
- [ ] 新規ファイル作成: `components/GLBCompeitoSingle.tsx`
- [ ] GLBモデル読み込み機能実装
- [ ] パステルカラー適用機能実装
- [ ] シンプルシーン構成

### Task 2: 美しい表示の実装
- [ ] 最適なカメラアングル設定
- [ ] 3方向ライティングシステム
- [ ] 滑らかな回転アニメーション
- [ ] サイズ調整（ビンより大きく）

### Task 3: reward.tsx修正
- [ ] GLBCompeitoJarからGLBCompeitoSingleに変更
- [ ] 不要なpropsを削除
- [ ] 表示レイアウトの最適化

## 期待される効果

### ビジュアル改善
- **焦点明確**: こんぺいとうのみに注目
- **美しい演出**: 単体表示で魅力最大化
- **カラフル**: パステルカラーで可愛らしく

### パフォーマンス向上
- **軽量化**: ビン描画なしで高速
- **シンプル**: 単純な構成で安定
- **滑らか**: 軽い処理で滑らかアニメーション

## 結論

**方針**: GLBCompeitoSingleコンポーネントを新規作成し、reward.tsxで使用
- ビンなしでこんぺいとう単体を美しく表示
- 既存のGLB読み込み・カラー機能を再利用
- reward画面に最適化された専用コンポーネント