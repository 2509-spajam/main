# React Native Expo 3D レンダリング調査報告（2025年9月更新）

## 調査日時
2025年9月27日

## 現在のプロジェクト環境
- **Expo SDK**: 54.0.10
- **React Native**: 0.81.4
- **React**: 19.1.0

## ライブラリバージョン互換性調査

### 最新バージョン（2025年9月時点）
- **expo-gl**: 16.0.7 ✅ SDK 54対応
- **expo-three**: 8.0.0 
- **three.js**: 0.180.0 (最新)

### バージョン互換性分析
1. **expo-gl 16.0.7**: Expo SDK 54に完全対応
2. **expo-three 8.0.0**: 
   - Three.jsがpeer dependencyとして分離（v5.0.0以降）
   - Expo SDK 54と互換性あり
   - 但し、古い依存関係が残存（警告の原因）

## 主要な変更点と推奨事項

### 1. 現在のベストプラクティス（2025年）

#### 推奨インストール方法
```bash
# Expo専用インストールコマンド使用
npx expo install expo-gl expo-three
npm install three

# TypeScript型定義（必須）
npm install --save-dev @types/three
```

#### 基本実装パターン
```tsx
import React from 'react';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

// Global THREE instance (Metro bundler requirement)
global.THREE = global.THREE || THREE;

export default function My3DComponent() {
  const onContextCreate = async (gl) => {
    // 1. Renderer setup
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    
    // 2. Scene creation
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 1000);
    
    // 3. Basic geometry
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    camera.position.z = 5;
    
    // 4. Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    animate();
  };

  return <GLView style={{ width: 300, height: 300 }} onContextCreate={onContextCreate} />;
}
```

### 2. 重要な制限事項（2025年版）

#### プラットフォーム制限
- **Web**: GLViewは動作しない（フォールバック必須）
- **iOS Simulator**: 制限あり（実機推奨）
- **Android Emulator**: 制限あり（実機推奨）

#### Metro Bundler設定
```js
// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const config = getDefaultConfig(__dirname);

// 3Dアセットサポート
config.resolver.assetExts.push('obj', 'mtl', 'gltf', 'glb');

module.exports = config;
```

### 3. 避けるべきアプローチ

#### ❌ 問題のあるパターン
1. **動的インポート使用**: `await import('three')`は不安定
2. **複雑なシェーダー**: 初期実装では避ける
3. **大きなモデルファイル**: Metro bundlerで問題
4. **Web対応無視**: フォールバック実装必須

#### ✅ 推奨パターン
1. **静的インポート**: `import * as THREE from 'three'`
2. **基本ジオメトリ**: Box, Sphere, Octahedron等
3. **シンプルマテリアル**: MeshBasicMaterial
4. **プラットフォーム分岐**: Web用フォールバック

### 4. パフォーマンス考慮事項

#### 最適化ポイント
- **ジオメトリ**: 低ポリゴン推奨（<1000頂点）
- **テクスチャ**: 512x512以下推奨
- **アニメーション**: requestAnimationFrame使用
- **メモリ管理**: dispose()による適切なクリーンアップ

### 5. 代替アプローチの検討

#### react-three-fiber
```bash
npx create-react-native-app -t with-react-three-fiber
```
- より宣言的なAPI
- React hooks統合
- 但し、学習コストあり

#### react-native-skia（新選択肢）
- React Native Skiaによる2D/3D描画
- より安定したパフォーマンス
- 但し、3D機能は限定的

## 推奨実装戦略

### Phase 1: 基本GL動作確認
1. シンプルなGLView実装
2. 基本的なWebGL操作のテスト
3. プラットフォーム分岐の確認

### Phase 2: Three.js基本統合
1. 静的インポートによるThree.js使用
2. 基本ジオメトリ（立方体）表示
3. 単純なアニメーション

### Phase 3: 3Dオブジェクト実装
1. より複雑な形状（Octahedron等）
2. マテリアルとライティング
3. インタラクション追加

## 結論

**Expo SDK 54での3D実装は可能**だが、以下のアプローチを推奨：

1. **段階的実装**: まず基本GL→Three.js基本→3Dオブジェクト
2. **静的インポート**: 動的インポートではなく通常のimport使用
3. **プラットフォーム対応**: Web用フォールバック必須
4. **実機テスト**: 開発初期段階から実機での確認

現在発生していたエラーは主に**動的インポート**と**依存関係の複雑さ**が原因。より安定したアプローチでの再実装を推奨します。