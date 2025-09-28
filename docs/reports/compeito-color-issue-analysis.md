# こんぺいとうパステルカラーのくすみ問題調査レポート

## 現状分析

### 設定されている色パレット

#### GLBCompeitoSingle.tsx / GLBCompeitoJar.tsx で使用（16進数）
```typescript
const PASTEL_COLORS = [
  new THREE.Color(0xFFB3BA), // ピンク
  new THREE.Color(0xFFDFBA), // ピーチ
  new THREE.Color(0xFFFFBA), // イエロー
  new THREE.Color(0xBAFFC9), // グリーン
  new THREE.Color(0xBAE1FF), // ブルー
  new THREE.Color(0xD4BAFF), // パープル
];
```

#### BottleDisplay3D.tsx で使用（16進数）
```typescript
const colors = [
  0xFFB3BA, 0xFFDFBA, 0xBAE1FF, 0xBAFFBA, 0xFFBAFF,
  0xFFF2BA, 0xBAFFC9, 0xFFBAE1, 0xE1BAFF, 0xBAFFF2
];
```

#### CompeitoJar.tsx で使用（固定色）
```typescript
const compeitoMaterial = new THREE.MeshPhongMaterial({
  color: 0xFFD700, // 金色（固定）
  shininess: 100,
  specular: 0xFFFFFF,
});
```

## 考えられる原因

### 1. **マテリアルの設定問題**
- **影響度**: 高
- **詳細**: `MeshPhongMaterial`の設定により、光の反射や陰影でくすんで見える可能性
- **具体的原因**:
  - `shininess`値が高すぎて不自然な光沢
  - `specular`色が色味を変化させている
  - 環境光とディレクショナルライトのバランスが悪い

### 2. **ライティング設定の問題**
- **影響度**: 高
- **詳細**: Three.jsの照明設定が適切でない
- **具体的原因**:
  - 環境光（AmbientLight）が暗すぎる
  - ディレクショナルライトの色温度
  - 光の強度バランス不良

### 3. **色空間・ガンマ補正の問題**
- **影響度**: 中
- **詳細**: WebGLレンダリングでの色空間処理
- **具体的原因**:
  - リニア色空間とsRGB色空間の混同
  - レンダラーの`outputColorSpace`設定未指定
  - ガンマ補正の不適用

### 4. **パステルカラー値の問題**
- **影響度**: 中
- **詳細**: 選択されている色彩値自体が暗い・彩度が低い
- **具体的原因**:
  - RGB値の明度が低い（0xBA = 186/255 = 72.9%）
  - 彩度が不十分でグレーがかって見える
  - HSL色空間での設計不足

### 5. **マテリアルクローン時の問題**
- **影響度**: 低〜中
- **詳細**: `child.material.clone()`での属性継承問題
- **具体的原因**:
  - 元のマテリアルの設定が引き継がれる
  - GLBモデル本来のマテリアル属性の影響
  - テクスチャやマッピング設定の残存

### 6. **デバイス・環境依存の問題**
- **影響度**: 低
- **詳細**: 表示環境によるレンダリング差異
- **具体的原因**:
  - 端末のディスプレイ設定（明度・コントラスト）
  - WebGLのサポート状況
  - モバイルとデスクトップでの差異

### 7. **背景・コンテキストの問題**
- **影響度**: 低
- **詳細**: 周囲の色や背景との対比効果
- **具体的原因**:
  - 透明背景（`setClearColor(0x000000, 0)`）による影響
  - ビンの色（グレー系）との対比不足
  - UI全体の色調との不調和

## 推奨解決アプローチ

### Phase 1: ライティング最適化
1. 環境光の明度を上げる（0.4 → 0.6）
2. ディレクショナルライトの設定調整
3. カラーテンペラチャーの調整

### Phase 2: マテリアル設定改善
1. `shininess`値の調整（100 → 30-50）
2. `specular`色の見直し
3. 必要に応じて`MeshLambertMaterial`への変更検討

### Phase 3: パステルカラーパレットの見直し
1. より明度の高い色値への変更
2. HSL色空間での色設計
3. A/Bテストによる視覚的検証

### Phase 4: レンダリング設定最適化
1. `outputColorSpace`の明示的設定
2. ガンマ補正の適用検討
3. トーンマッピング設定

## 次のアクション
1. 実際のレンダリング結果を確認
2. ライティング設定の段階的調整実験
3. 複数デバイスでの表示確認