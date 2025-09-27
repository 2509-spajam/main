# こんぺいとうビン表示コンポーネント調査レポート

## 目的
指定した数のこんぺいとうをビン（瓶・容器）に表示するReact Nativeコンポーネントの実装要件調査

## 現在の環境
- **Expo SDK**: 54.0.10
- **React Native**: 0.81.4  
- **Three.js**: 0.166.1
- **expo-gl**: 16.0.7
- **expo-three**: 8.0.0

## 要件分析

### 1. ビジュアル要件
- **ビン（容器）**: 透明または半透明のガラス瓶
- **こんぺいとう**: 複数個の金色の八面体（Octahedron）
- **数の指定**: プロパティで個数を制御可能
- **物理的表現**: こんぺいとうがビンの中に自然に積み重なる

### 2. 技術要件
- React Nativeで動作
- iOS/Android対応（Web用フォールバック）
- パフォーマンス最適化
- メモリ効率

## 実装アプローチ

### アプローチ1: ジオメトリベース（推奨）
**概要**: Three.jsの基本ジオメトリでビンとこんぺいとうを作成

#### 必要な要素:

1. **ビン（容器）**
   ```typescript
   // 円柱ジオメトリでビン本体
   const jarGeometry = new THREE.CylinderGeometry(
     1.2,    // 上部半径
     1.0,    // 下部半径  
     2.5,    // 高さ
     32,     // 円周分割数
     1,      // 高さ分割数
     true    // 開口部（上が開いている）
   );
   
   // 透明マテリアル
   const jarMaterial = new THREE.MeshPhongMaterial({
     color: 0xCCCCCC,
     transparent: true,
     opacity: 0.3,
     side: THREE.DoubleSide
   });
   ```

2. **こんぺいとう配置システム**
   ```typescript
   // 既存のOctahedronを使用
   const compeitoGeometry = new THREE.OctahedronGeometry(0.1, 0);
   const compeitoMaterial = new THREE.MeshPhongMaterial({
     color: 0xFFD700, // 金色
     shininess: 100
   });
   
   // インスタンスメッシュで効率的な複数表示
   const instancedMesh = new THREE.InstancedMesh(
     compeitoGeometry, 
     compeitoMaterial, 
     count // こんぺいとうの数
   );
   ```

3. **配置ロジック**
   ```typescript
   // ビン内のランダム配置（物理シミュレーション簡易版）
   const positions = generateCompeitoPositions(count, jarRadius, jarHeight);
   positions.forEach((pos, index) => {
     const matrix = new THREE.Matrix4();
     matrix.setPosition(pos.x, pos.y, pos.z);
     instancedMesh.setMatrixAt(index, matrix);
   });
   ```

#### 追加ライブラリ: **不要** ✅
- 現在のThree.js環境で実装可能
- すべて標準ジオメトリとマテリアルで対応

### アプローチ2: 物理エンジン使用（オプション）
**概要**: より自然な積み重なりのためcannonjs等を使用

#### 必要な追加ライブラリ:
```bash
npm install cannon-es @types/cannon-es
```

#### メリット・デメリット:
- ✅ **メリット**: 現実的な落下・積み重なり
- ❌ **デメリット**: バンドルサイズ増加、実装複雑度上昇

### アプローチ3: スプライトベース（フォールバック用）
**概要**: Web環境用の2D代替表現

#### 必要な要素:
- Canvas 2D APIまたはSVG
- こんぺいとう画像素材
- 位置計算ロジック

## 推奨実装計画

### Phase 1: 基本ビン表示（アプローチ1）
1. **CylinderGeometry でビン作成**
2. **透明マテリアル設定**  
3. **単一こんぺいとうテスト表示**

### Phase 2: 複数こんぺいとう配置
1. **InstancedMesh 実装**
2. **ランダム配置アルゴリズム**
3. **ビン境界内制限**

### Phase 3: 最適化・アニメーション
1. **LOD (Level of Detail) 実装**
2. **入場アニメーション**
3. **パフォーマンス調整**

## コンポーネントAPI設計案

```typescript
interface CompeitoJarProps {
  count: number;           // こんぺいとうの数 (1-100)
  size?: 'small' | 'medium' | 'large'; // ビンサイズ
  animated?: boolean;      // アニメーション有効
  style?: ViewStyle;       // スタイリング
}

// 使用例
<CompeitoJar count={15} size="medium" animated={true} />
```

## 技術的制約・考慮事項

### パフォーマンス
- **100個以下**: InstancedMeshで効率的描画
- **レンダリング最適化**: frustum culling, LOD
- **メモリ管理**: 適切なdispose処理

### プラットフォーム対応
- **iOS/Android**: 完全3D表示
- **Web**: 2Dフォールバック（SVG/Canvas）

### バンドルサイズ
- **現在**: 追加ライブラリ不要
- **将来拡張**: 必要に応じてphysicsエンジン追加

## 結論

**追加ライブラリ: 不要** 

現在のthree.js 0.166.1 + expo-three 8.0.0環境で、標準ジオメトリ（CylinderGeometry、OctahedronGeometry）とInstancedMeshを使用することで、効率的なこんぺいとうビンコンポーネントを実装可能。

物理エンジンは現時点では不要で、数学的な配置アルゴリズムで十分にリアルな表現が可能。

## 次のステップ
1. `CompeitoJar.tsx` コンポーネント作成
2. 基本ビン形状実装  
3. こんぺいとう配置ロジック実装
4. テスト・最適化

---
*調査日: 2025-09-27*
*対象環境: Expo SDK 54, Three.js 0.166.1*