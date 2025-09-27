# p2.js 物理エンジン分析レポート

## 概要
JavaScript純正2D物理エンジンp2.jsのExpo/React Native環境適用可能性調査

## 基本情報

### 技術アーキテクチャ
- **言語**: 純JavaScript（WebAssembly依存なし）
- **次元**: 2D専用（3D非対応）
- **サイズ**: 軽量（他エンジンと比較）
- **依存**: 外部依存最小限

### 機能セット
```javascript
// 基本機能
- 剛体物理シミュレーション
- 多様な形状（Circle、Box、Plane等）
- 制約・ジョイントシステム
- 衝突検出・応答
- 材質システム（摩擦、反発）
```

## 利点分析 ✅

### 1. 軽量性 ✅
**利点:**
- 純JavaScript実装
- WebAssembly不要
- 小さなバンドルサイズ
- 高速初期化

### 2. モバイル対応実績 ✅
**実証例:**
- tapball.htmlでモバイルゲーム実装
- タッチイベント対応
- デバイス最適化設定
- Canvas Rendering対応

### 3. 統合容易性 ✅
**統合性:**
- Canvas API直接利用
- Pixi.js統合例あり
- DOM要素連携可能
- イベント処理簡潔

### 4. React Native適用可能性 ⚠️
**推測:**
- 純JavaScript = React Native互換性高
- Canvas代替（react-native-canvas等）利用可能
- 外部依存少ない = 問題少ない

## 致命的制約 ❌

### 1. 2D専用制限 ❌
**根本問題:**
- 3Dボトル+コンペイトウレンダリング不可
- Three.js統合不可能
- Z軸物理計算なし
- 3D空間概念なし

### 2. 既存システム不適合 ❌
**統合問題:**
- 現在のBottleDisplay3D（Three.js）と統合不可
- GLBモデル（3D）を2D化必要
- 3D視覚効果実現不可能

## コード例分析

### 基本使用パターン
```javascript
// World作成
var world = new p2.World({
    gravity: [0, -9.82]
});

// 剛体作成
var body = new p2.Body({
    mass: 5,
    position: [0, 10]
});

// 形状追加
var shape = new p2.Circle({ radius: 1 });
body.addShape(shape);
world.addBody(body);

// シミュレーション
world.step(1/60);
```

### モバイル最適化例
```javascript
// Mobile viewport設定
<meta name="viewport" content="width=device-width, user-scalable=no">

// タッチ対応
canvas.addEventListener('touchstart', handleTouch);
canvas.addEventListener('touchmove', handleTouch);

// デバイス比率対応
canvas.width = window.innerWidth * window.devicePixelRatio;
canvas.height = window.innerHeight * window.devicePixelRatio;
```

## React Native適用推測

### 理論的実装例
```typescript
// react-native-canvas利用想定
import Canvas from 'react-native-canvas';
import p2 from 'p2';

const Physics2D = () => {
  const world = new p2.World({ gravity: [0, -9.82] });
  
  // Canvas描画でp2.jsシミュレーション
  const render = (canvas) => {
    const ctx = canvas.getContext('2d');
    // p2.js body positions → Canvas描画
  };
};
```

## 比較評価

### vs cannon-es/Rapier
**利点:**
- 純JavaScript = 統合容易性
- 軽量 = モバイル性能良好
- 実証されたモバイル対応

**制約:**
- 2D限定 = 3D要件満たせず
- 既存3Dシステム破棄必要

## 結論

### p2.js使用: ❌ 非推奨

**決定的理由:**
1. **3D要件不適合**: ボトル+コンペイトウ3D表現不可能
2. **既存システム破棄**: Three.js + GLBモデル全廃必要
3. **視覚効果劣化**: 3D → 2D で体験価値低下
4. **開発コスト**: 全面的アーキテクチャ変更

### 条件付き検討可能性
- **IF 2D表現許容**: シンプル2D落下ゲーム要求
- **IF 軽量性最優先**: バンドルサイズ厳格制限
- **IF Canvas利用**: react-native-canvas統合前提

## 次のステップ
1. ユーザー要件再確認（3D vs 2D許容度）
2. 軽量カスタム実装検討
3. Three.js標準機能活用検討

## 参考資料
- p2.js GitHub: https://github.com/schteppe/p2.js
- Mobile例: tapball.html
- Canvas統合例: 各examplesフォルダ