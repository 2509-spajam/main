# 3Dモデル描画問題調査レポート

## 問題の症状

**Blender vs アプリの比較**:
- **Blender (期待値)**: 美しい星形のこんぺいとう（Image 1）
- **アプリ (実際)**: 変形した奇妙な形状（Image 2）

## 原因分析

### 1. ジオメトリ生成の問題

現在のCustomCompeitoCache.createCustomCompeito()の実装を分析：

```typescript
// 中央のコア（星形）
const starGeometry = new THREE.ConeGeometry(size * 0.8, size * 1.2, 5);

// 装飾的な小さなスパイク  
for (let i = 0; i < 8; i++) {
  const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
  spike.position.x = Math.cos(angle) * size * 0.7;
  spike.position.z = Math.sin(angle) * size * 0.7;
  spike.rotation.z = angle; // ❌ 問題：Z軸回転のみ
}
```

**問題点**:

1. **回転軸の不適切さ**: 
   - `spike.rotation.z = angle` は平面内回転
   - こんぺいとうのスパイクは中央から外向きに向ける必要がある
   - 正しくは `lookAt()` または適切な回転行列が必要

2. **ジオメトリの向きの問題**:
   - ConeGeometryはデフォルトでY軸方向（上向き）
   - スパイクを放射状に配置するには、各スパイクを中心から外向きに向ける必要

3. **スケーリングの問題**:
   - `compeitoSize = 0.08` という小さな値
   - スパイクサイズ `size * 0.2` = 0.016 (非常に小さい)
   - モバイルでの表示には小さすぎる可能性

### 2. Three.js vs Blenderの座標系の違い

- **Blender**: Z-up座標系
- **Three.js**: Y-up座標系
- 座標変換が正しく行われていない可能性

### 3. マテリアルとライティングの問題

```typescript
const starMaterial = new THREE.MeshPhongMaterial({
  color: 0xff69b4,
  shininess: 100,
  transparent: true,
  opacity: 0.9
});
```

**潜在的問題**:
- PhongMaterialはライティングに依存
- モバイル環境でのライティング設定が不適切
- 透明度0.9が重複レンダリング問題を引き起こしている可能性

### 4. レンダリング順序とZ-Fighting

複数のMeshが重なって配置されている場合：
- Z-Fightingによる描画の乱れ
- 透明オブジェクトの描画順序問題

## 推定される主要原因

**最も可能性が高い原因**: **スパイクの向きが間違っている**

現在のコード:
```typescript
spike.rotation.z = angle; // 平面回転のみ
```

正しい実装:
```typescript
// スパイクを中心から外向きに向ける
spike.lookAt(
  spike.position.x * 2, // 外向きのベクトル
  0,
  spike.position.z * 2
);
```

## 次のステップ

1. **スパイク方向の修正**: lookAt()を使用した正しい向き設定
2. **座標系の確認**: Y-up座標系での適切な配置
3. **サイズ調整**: モバイル表示に適したスケール
4. **マテリアル最適化**: BasicMaterialでのテスト
5. **デバッグ表示**: ワイヤーフレーム表示での形状確認

## 修正提案

CustomCompeitoモデル生成アルゴリズムの完全な見直しが必要。
特にスパイクの配置と向きの計算を正確に実装する必要がある。