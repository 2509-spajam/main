# 物理エンジン総合比較分析レポート

## 概要
コンペイトウボトル落下システム用物理エンジンの包括的評価結果

## 調査対象エンジン

### 1. cannon-es
- **タイプ**: 3D物理エンジン（WebAssembly）
- **結論**: ❌ 非推奨

### 2. Rapier.js
- **タイプ**: 3D物理エンジン（Rust + WebAssembly）
- **結論**: ❌ 非推奨

### 3. p2.js
- **タイプ**: 2D物理エンジン（純JavaScript）
- **結論**: ❌ 不適合（2D制限）

### 4. Matter.js
- **タイプ**: 2D物理エンジン（純JavaScript）
- **結論**: ❌ 不適合（2D制限）

## 共通制約分析

### React Native/Expo環境制限
| エンジン | WebAssembly | 純JS | Expo対応 | 実証例 |
|---------|-------------|------|----------|-------|
| cannon-es | ❌ | ❌ | ❌ | ❌ |
| Rapier.js | ❌ | ❌ | ❌ | ❌ |
| p2.js | ✅ | ✅ | 推測○ | ❌ |
| Matter.js | ✅ | ✅ | 推測○ | ❌ |

### 3D要件適合性
| エンジン | 3D対応 | Three.js統合 | GLB対応 | 実用性 |
|---------|-------|-------------|---------|--------|
| cannon-es | ✅ | 理論○ | 理論○ | ❌複雑 |
| Rapier.js | ✅ | 不明 | 不明 | ❌複雑 |
| p2.js | ❌ | ❌ | ❌ | ❌不可能 |
| Matter.js | ❌ | ❌ | ❌ | ❌不可能 |

## 決定的問題点

### 1. Expo環境適用困難 ❌
**WebAssembly系エンジンの問題:**
- Web Workers制限
- expo-gl統合複雑性
- デバッグ・トラブルシュート困難

### 2. 2D エンジンの要件不適合 ❌
**2D限定エンジンの問題:**
- 3Dボトル表現不可能
- Three.js + GLB資産破棄
- 視覚体験劣化

### 3. 過剰仕様問題 ⚠️
**全エンジン共通:**
- シンプル落下には大きすぎる機能セット
- 学習・実装コスト過大
- モバイル性能負荷

## 代替方案検討

### A. カスタム軽量物理実装 ✅
```typescript
// 基本コンセプト
class SimplePhysics {
  gravity = -9.8;
  
  updateBody(body: PhysicsBody, deltaTime: number) {
    // 重力適用
    body.velocity.y += this.gravity * deltaTime;
    
    // 位置更新
    body.position.add(body.velocity.clone().multiplyScalar(deltaTime));
    
    // 衝突検出（ボトル境界のみ）
    this.checkBottleCollision(body);
  }
  
  checkBottleCollision(body: PhysicsBody) {
    // シンプルなレイキャスト
    // Three.js Raycaster利用
    const raycaster = new THREE.Raycaster();
    // ボトル境界チェック
  }
}
```

### B. Three.js標準機能活用 ✅
```typescript
// Three.js組み込み機能利用
import { Raycaster, Vector3 } from 'three';

class ThreeJSPhysics {
  raycaster = new Raycaster();
  
  // レイキャスト衝突検出
  checkCollision(object: THREE.Object3D, direction: Vector3) {
    this.raycaster.set(object.position, direction);
    const intersects = this.raycaster.intersectObjects([bottleModel]);
    return intersects.length > 0;
  }
}
```

### C. 段階的実装アプローチ ✅
```
Phase 1: 基本落下（重力のみ）
Phase 2: ボトル境界衝突
Phase 3: バウンス・摩擦追加
Phase 4: 複数コンペイトウ相互作用（必要に応じて）
```

## 推奨実装戦略

### 1. カスタム軽量実装 🎯
**利点:**
- Expo環境完全対応
- Three.js直接統合
- 必要最小限機能
- デバッグ容易
- モバイル最適化

**実装範囲:**
- 基本重力物理
- ボトル境界衝突（レイキャスト）
- シンプルバウンス
- 摩擦・減衰

### 2. 段階的開発 📈
**Step 1**: MVP物理実装
**Step 2**: Expo環境テスト
**Step 3**: パフォーマンス最適化
**Step 4**: 必要に応じて拡張

## 実装優先度

### 必須機能
1. ✅ 重力落下
2. ✅ ボトル内境界衝突
3. ✅ 基本バウンス

### 拡張機能（オプション）
1. ⚠️ コンペイトウ間衝突
2. ⚠️ 回転物理
3. ⚠️ 高度摩擦モデル

## 結論

### 最終推奨: カスタム軽量実装 🏆

**理由:**
1. **Expo適合性**: 環境制限なし
2. **3D要件対応**: Three.js + GLB統合保持
3. **実装負荷**: 必要最小限
4. **性能優位**: モバイル最適化
5. **保守性**: シンプル・理解容易

### 次ステップ
1. 基本物理プロトタイプ実装
2. Expo環境動作確認
3. ボトル衝突検証
4. パフォーマンス測定

## 参考実装例
- Three.js Raycaster: https://threejs.org/docs/#api/en/core/Raycaster
- 基本物理シミュレーション: Verlet Integration
- モバイル最適化: requestAnimationFrame throttling