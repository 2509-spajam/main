# 物理エンジン実装調査レポート

## 調査目標
bottle.glb の中にコンペイトウが自然に落ちて留まる物理シミュレーションを実装する

## 調査結果

### 1. React Three Cannon の制約
- `@react-three/cannon` は Web Workers を使用
- Expo環境では Web Workers の制約により動作困難
- 複雑なセットアップが必要で、expo-gl との互換性に課題

### 2. Expo公式での Three.js 実装例
- `expo/examples/with-three` : 純粋なthree.jsを使用したアプローチ
- `expo/examples/with-react-three-fiber` : React Three Fiber を使用した宣言的アプローチ
- どちらも expo-gl 上で正常に動作

### 3. 推奨実装アプローチ

#### A. シンプル物理実装（推奨）
- Three.js の基本機能のみを使用
- JavaScriptで簡単な重力・衝突検出を実装
- 軽量で Expo 環境での動作が確実

**メリット:**
- Expo環境での確実な動作
- 軽量で高速
- デバッグが容易

**実装内容:**
```javascript
// コンペイトウの物理プロパティ
const konpeito = {
  position: { x: 0, y: 5, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  gravity: -9.8,
  bounce: 0.3
};

// シンプル物理アップデート
function updatePhysics(deltaTime) {
  velocity.y += gravity * deltaTime;
  position.y += velocity.y * deltaTime;
  
  // ボトル境界との衝突検出
  if (position.y < bottleFloor) {
    position.y = bottleFloor;
    velocity.y *= -bounce;
  }
}
```

#### B. より高度な物理実装（将来拡張）
- cannon-es をサーバーサイドレンダリングモード使用
- React Native 用の物理ライブラリ統合

## 次のステップ

### 即座実装可能（推奨）
1. 現在の BottleDisplay3D.tsx を拡張
2. シンプルな重力・衝突システムを追加
3. ボトルの形状に合わせた境界設定
4. 複数のコンペイトウ対応

### 実装順序
1. **単一コンペイトウの重力落下** - 基本物理の実装
2. **ボトル境界との衝突検出** - 床と壁の境界設定
3. **複数コンペイトウ対応** - 複数オブジェクトの物理計算
4. **視覚効果改善** - バウンス、回転などの追加

### 必要なファイル変更
- `components/BottleDisplay3D.tsx` - 物理ロジック追加
- `components/PhysicsKonpeito.tsx` - 新しい物理対応コンペイトウコンポーネント

## 結論
React Three Cannon よりもシンプルな JavaScript 物理実装が Expo 環境に最適。
軽量で確実に動作し、必要な物理効果（重力、バウンス、衝突）は十分実装可能。