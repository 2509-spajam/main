# 最小限コンペイトウ物理システム実装計画

## 🎯 目標
**最小限の実装で以下を実現:**
1. ✅ ビンからコンペイトウが出ない（すり抜けない）
2. ✅ コンペイトウ同士が衝突する

## 🔧 必要最小限の実装内容

### 1. 複数コンペイトウの生成と管理
```typescript
interface CompeitoPhysics {
  position: { x: number, y: number, z: number };
  velocity: { x: number, y: number, z: number };
  radius: number;
  model: THREE.Object3D;
}

// 3-5個のコンペイトウ配列
const compeitos: CompeitoPhysics[] = [];
```

### 2. ビン境界の衝突判定（円柱形状）
```typescript
function constrainToBottle(compeito: CompeitoPhysics) {
  const BOTTLE_RADIUS = 0.7;   // ビンの内半径
  const BOTTLE_BOTTOM = -0.8;  // ビンの底
  
  // XZ平面での円形境界チェック
  const distFromCenter = Math.sqrt(
    compeito.position.x ** 2 + compeito.position.z ** 2
  );
  
  if (distFromCenter + compeito.radius > BOTTLE_RADIUS) {
    // 壁に押し戻し
    const scale = (BOTTLE_RADIUS - compeito.radius) / distFromCenter;
    compeito.position.x *= scale;
    compeito.position.z *= scale;
    
    // 速度反射
    const nx = compeito.position.x / distFromCenter;
    const nz = compeito.position.z / distFromCenter;
    const dot = compeito.velocity.x * nx + compeito.velocity.z * nz;
    compeito.velocity.x -= 2 * dot * nx;
    compeito.velocity.z -= 2 * dot * nz;
  }
  
  // 底面衝突
  if (compeito.position.y - compeito.radius < BOTTLE_BOTTOM) {
    compeito.position.y = BOTTLE_BOTTOM + compeito.radius;
    compeito.velocity.y = -compeito.velocity.y * 0.7; // 反発
  }
}
```

### 3. コンペイトウ同士の衝突判定
```typescript
function handleCompeitoCollisions(compeitos: CompeitoPhysics[]) {
  for (let i = 0; i < compeitos.length - 1; i++) {
    for (let j = i + 1; j < compeitos.length; j++) {
      const a = compeitos[i];
      const b = compeitos[j];
      
      const dx = a.position.x - b.position.x;
      const dy = a.position.y - b.position.y;
      const dz = a.position.z - b.position.z;
      const distanceSquared = dx*dx + dy*dy + dz*dz;
      
      const radiusSum = a.radius + b.radius;
      if (distanceSquared < radiusSum * radiusSum) {
        // 衝突発生 - シンプルな分離処理
        const distance = Math.sqrt(distanceSquared);
        const overlap = radiusSum - distance;
        
        // 正規化された方向ベクトル
        const nx = dx / distance;
        const ny = dy / distance;
        const nz = dz / distance;
        
        // 位置補正（重なり解除）
        const correction = overlap * 0.5;
        a.position.x += nx * correction;
        a.position.y += ny * correction;
        a.position.z += nz * correction;
        
        b.position.x -= nx * correction;
        b.position.y -= ny * correction;
        b.position.z -= nz * correction;
        
        // 速度交換（簡易版）
        const tempVelX = a.velocity.x;
        const tempVelY = a.velocity.y;
        const tempVelZ = a.velocity.z;
        
        a.velocity.x = b.velocity.x * 0.8; // 摩擦
        a.velocity.y = b.velocity.y * 0.8;
        a.velocity.z = b.velocity.z * 0.8;
        
        b.velocity.x = tempVelX * 0.8;
        b.velocity.y = tempVelY * 0.8;
        b.velocity.z = tempVelZ * 0.8;
      }
    }
  }
}
```

## 📋 実装手順（2時間で完成）

### Step 1: 複数コンペイトウ生成 (30分)
- [ ] `BottleDisplay3D.tsx`内で複数のコンペイトウモデルを作成
- [ ] ランダム初期位置配置（ビン上部）
- [ ] 物理データ構造の初期化

### Step 2: ビン境界衝突 (45分)  
- [ ] 円柱形状の境界判定実装
- [ ] 壁面・底面での位置補正と速度反射
- [ ] テスト確認（コンペイトウが外に出ないか）

### Step 3: コンペイトウ間衝突 (30分)
- [ ] 球体同士の衝突検出
- [ ] 重なり解除と簡易速度交換
- [ ] 全体動作テスト

### Step 4: 調整・デバッグ (15分)
- [ ] パラメータ調整（重力・反発・摩擦）
- [ ] 見た目の改善
- [ ] 最終確認

## 🎨 実装詳細仕様

### 物理パラメータ
```typescript
const PHYSICS_CONFIG = {
  gravity: -0.0008,        // 重力加速度  
  restitution: 0.6,        // 反発係数
  friction: 0.8,           // 摩擦係数
  bottleRadius: 0.7,       // ビン内半径
  bottleBottom: -0.8,      // ビン底面
  compeitoRadius: 0.05,    // コンペイトウ半径
  compeitoCount: 4         // コンペイトウ数
};
```

### アニメーションループ
```typescript
const updatePhysics = (deltaTime: number) => {
  compeitos.forEach(compeito => {
    // 重力適用
    compeito.velocity.y += PHYSICS_CONFIG.gravity;
    
    // 位置更新
    compeito.position.x += compeito.velocity.x * deltaTime;
    compeito.position.y += compeito.velocity.y * deltaTime; 
    compeito.position.z += compeito.velocity.z * deltaTime;
    
    // ビン境界制約
    constrainToBottle(compeito);
    
    // 3Dモデル同期
    compeito.model.position.copy(compeito.position);
  });
  
  // コンペイトウ同士衝突
  handleCompeitoCollisions(compeitos);
};
```

## 🚧 技術的制約と妥協点

### 妥協する機能
- ❌ 高精度物理演算
- ❌ 複雑な形状衝突
- ❌ 回転・トルク計算  
- ❌ 性能最適化

### 確実に実装する機能
- ✅ 境界からの脱出防止
- ✅ 基本的なコンペイトウ間衝突
- ✅ 安定した落下アニメーション
- ✅ 60FPS維持

## 📂 関連ファイル

### 修正対象
- `expo-app/components/BottleDisplay3D.tsx` - メイン実装ファイル

### 参考資料  
- `docs/reports/custom-physics-collision-research.md` - 衝突判定詳細調査
- `expo-app/assets/objs/conpeito.glb` - コンペイトウ3Dモデル
- `expo-app/assets/objs/bottle.glb` - ビン3Dモデル

## 🎯 成功基準

1. **ビン制約**: コンペイトウが一度もビンから出ない
2. **衝突動作**: コンペイトウ同士がぶつかって跳ね返る
3. **安定性**: 10秒間エラーなく動作継続
4. **性能**: フレームレート30FPS以上維持

**実装時間目標: 2時間以内**
    compeitoModel.position.y = compeitoY;
  } else if (compeitoY <= -0.8) {
    compeitoY = -0.8;
    falling = false;
  }
  
  rendererRef.current.render(scene, camera);
  gl.endFrameEXP();
  
  if (falling) {
    requestAnimationFrame(animate);
  }
};

animate(); // アニメーション開始
```

**これで落下完了！** 🎉

---

## 📊 **実装レベル比較**

| レベル | 実装時間 | 効果 | 必要性 |
|--------|----------|------|--------|
| **Level 0**: 現状静的 | 0分 | ❌ 動かない | - |
| **Level 1**: シンプル落下 | 15分 | ✅ 落ちる！ | 必須 |
| **Level 2**: 底反発 | +10分 | ✅ バウンス | 推奨 |
| **Level 3**: 複数個 | +30分 | ✅ にぎやか | あれば良い |
| **Level 4**: 壁衝突 | +2時間 | ✅ リアル | 余裕があれば |
| **Level 5**: 相互衝突 | +4時間 | ✅ 超リアル | 不要？ |

---

## 🚀 **推奨実装戦略**

### ✅ **Step 1: 15分で動かす**
```typescript
// BottleDisplay3D.tsx の onContextCreate 内に追加
let compeitoY = 0.5;

const animate = () => {
  compeitoY -= 0.01;
  compeitoModel.position.y = compeitoY;
  
  if (compeitoY > -0.8) {
    rendererRef.current.render(scene, camera);
    gl.endFrameEXP();
    requestAnimationFrame(animate);
  }
};
animate();
```

### ✅ **Step 2: 10分で反発追加**
```typescript
let velocity = 0;
let compeitoY = 0.5;

const animate = () => {
  velocity -= 0.001; // 重力
  compeitoY += velocity;
  
  if (compeitoY < -0.8) { // 底に当たったら
    compeitoY = -0.8;
    velocity = -velocity * 0.7; // 反発
  }
  
  compeitoModel.position.y = compeitoY;
  
  if (Math.abs(velocity) > 0.001) {
    rendererRef.current.render(scene, camera);
    gl.endFrameEXP();
    requestAnimationFrame(animate);
  }
};
```

### ✅ **Step 3: 30分で複数個**
```typescript
const compeitoModels = [];
const velocities = [];

for (let i = 0; i < 5; i++) {
  const model = compeitoGltf.scene.clone();
  model.position.set(
    Math.random() * 0.2 - 0.1,  // X: -0.1 ~ 0.1
    0.5 + i * 0.1,              // Y: 順番に配置
    Math.random() * 0.2 - 0.1   // Z: -0.1 ~ 0.1
  );
  compeitoModels.push(model);
  velocities.push(0);
  scene.add(model);
}
```

---

## ❌ **過剰設計だった部分**

元計画の90%は**不要でした**：

- ❌ 複雑なPhysicsWorld クラス
- ❌ CollisionDetector システム
- ❌ 衝突応答の数学的計算
- ❌ Raycaster による精密衝突
- ❌ 空間分割最適化
- ❌ オブジェクトプーリング

**実際には**: シンプルなY座標更新だけで十分！

---

## 🎯 **新しい現実的スケジュール**

### Day 1: 1時間で完成！
- ✅ 15分: Level 1 (落下)
- ✅ 10分: Level 2 (反発)  
- ✅ 30分: Level 3 (複数個)
- ✅ 5分: デバッグ・調整

**結論**: わずか1時間で「ビンの中でこんぺいとうが落下・バウンス」が実現可能！

## 実装スケジュール

### ✅ **現実的な1時間プラン**

**Step 1 (15分)**: 基本落下
- 既存 `BottleDisplay3D.tsx` に30行追加
- シンプルなY座標更新ループ

**Step 2 (10分)**: 底反発  
- 速度変数追加
- 底衝突時の反発計算

**Step 3 (30分)**: 複数コンペイトウ
- 配列でモデル管理
- ループで一括更新

**Step 4 (5分)**: 調整・デバッグ
- パラメータ調整
- エラー確認

### ❌ **元の4日計画は過剰設計**
- 複雑なクラス設計：不要
- 高精度衝突検出：不要  
- 性能最適化：不要
- 大量テスト：不要

## 技術仕様

### 🎯 **最低限実装**
```typescript
// 必要なのはこれだけ！
let compeitoY = 0.5;      // 位置
let velocity = 0;         // 速度  
const gravity = -0.001;   // 重力
const bounce = 0.7;       // 反発係数
const floor = -0.8;       // 底の位置

// アニメーションループ
const animate = () => {
  velocity += gravity;           // 重力で加速
  compeitoY += velocity;         // 位置更新
  
  if (compeitoY < floor) {       // 底衝突
    compeitoY = floor;
    velocity = -velocity * bounce; // 反発
  }
  
  compeitoModel.position.y = compeitoY; // 3D更新
  
  if (Math.abs(velocity) > 0.001) {     // 停止判定
    render(); 
    requestAnimationFrame(animate);
  }
};
```

### ❌ **過剰だった仕様**
- ~~WebAssembly物理エンジン~~
- ~~複雑な衝突検出~~
- ~~Raycaster精密計算~~
- ~~空間最適化~~
- ~~メモリプーリング~~

## 品質保証

### テスト項目
- [ ] 単一落下の物理精度
- [ ] ボトル境界衝突の正確性  
- [ ] 複数オブジェクト安定性
- [ ] メモリリーク検証
- [ ] フレームレート測定（目標: 60FPS）

### デバッグ支援
- 物理オブジェクト可視化
- 衝突ポイント表示
- 速度ベクトル描画
- 性能メトリクス表示

## リスク対策

### 技術リスク
1. **性能問題**: 段階的最適化、フレーム制御
2. **衝突精度**: Three.js Raycaster活用、テスト強化
3. **メモリリーク**: 明示的リソース管理

### 実装リスク  
1. **複雑度増大**: 段階的実装、MVP重視
2. **時間超過**: 優先度による機能調整
3. **Expo互換**: 純JavaScript設計で回避

## 関連ファイル

### 既存（活用）
- `expo-app/components/BottleDisplay3D.tsx` - 3D表示基盤
- `expo-app/assets/objs/bottle.glb` - ボトルモデル
- `expo-app/assets/objs/conpeito.glb` - コンペイトウモデル

### 新規実装
- `expo-app/physics/types.ts` - 物理データ型
- `expo-app/physics/SimplePhysics.ts` - 物理エンジンコア
- `expo-app/physics/CollisionDetector.ts` - 衝突検出
- `expo-app/physics/CollisionResolver.ts` - 衝突応答
- `expo-app/physics/index.ts` - エクスポート

- 過度に複雑な3Dモデル     size?: 'small' | 'medium' | 'large';

     animated?: boolean;

理想:     interactive?: boolean;         // タッチ追加機能

- シンプルな中心部 + 適度な突起     style?: any;

- こんぺいとうらしい丸みを帯びた形状     showCount?: boolean;

     onCompeitoAdd?: (newCount: number) => void;

### 3. スケーリングの問題   }

   ```

現在:

- `scaleFactor = 15` で巨大化### Phase 3: GLBモデル最適化

- `scale.setScalar(0.8)` で縮小1. **インスタンス化**

- 二段階のスケーリングで予測困難   - 単一GLBモデルを複数インスタンス表示

   - InstancedMeshでパフォーマンス向上

## 修正計画

2. **LOD (Level of Detail)**

### Phase 1: ジオメトリの簡素化   - 距離に応じてモデル詳細度調整

   - フレームレート安定化

1. **中央コアの変更**

   - Dodecahedron → Sphere（球体）### Phase 4: アニメーション強化

   - よりこんぺいとうらしい丸い形状1. **GLBアニメーション**

   - モデル内蔵アニメーション対応

2. **スパイク数の削減**   - 個別こんぺいとうの微細な動き

   - 12個 → 6-8個

   - 主に水平方向に配置2. **物理演算統合** (オプション)

   - より自然な落下・跳ね返り

3. **レイヤー削除**   - GLBモデルの境界ボックス使用

   - 3層 → 1層（水平のみ）

   - 上下の突起を除去## 技術的実装詳細



### Phase 2: 形状の最適化### GLBローダー実装

```typescript

1. **スパイクの形状改良**import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

   - より短く、太めの突起

   - こんぺいとうらしい丸みを追加class GLBModelCache {

  private static cache = new Map<string, THREE.Group>();

2. **配置の調整**  

   - 不規則な配置でより自然に  static async loadModel(path: string): Promise<THREE.Group> {

   - 高さのバリエーション追加    if (this.cache.has(path)) {

      return this.cache.get(path)!.clone();

### Phase 3: スケーリングの整理    }

    

1. **一貫したサイズ管理**    const loader = new GLTFLoader();

   - 単一のスケールファクターで管理    const gltf = await loader.loadAsync(path);

   - 予測可能なサイズ調整    this.cache.set(path, gltf.scene);

    return gltf.scene.clone();

2. **パフォーマンス最適化**  }

   - ポリゴン数の削減}

   - レンダリング負荷軽減```



## 実装タスク### GLBインスタンス化システム

```typescript

### Task 1: シンプルなこんぺいとう形状の作成// 効率的なGLBインスタンス表示

- [ ] 中央を球体に変更const createGLBInstancedMesh = (model: THREE.Group, count: number) => {

- [ ] スパイクを6個に削減  // GLBメッシュを解析してInstancedMeshに変換

- [ ] 水平配置のみに限定  const geometry = extractGeometryFromGLB(model);

  const material = extractMaterialFromGLB(model);

### Task 2: 形状の美しさ向上  

- [ ] スパイクの長さ・太さ調整  return new THREE.InstancedMesh(geometry, material, count);

- [ ] 不規則配置の実装};

- [ ] 丸みのある突起形状```



### Task 3: スケールとパフォーマンス最適化### アセット管理

- [ ] スケーリングロジックの簡素化```

- [ ] ポリゴン数の最適化expo-app/assets/

- [ ] モバイル表示での検証├── objs/

│   └── conpeito.glb          # メインこんぺいとうモデル

### Task 4: テストと調整└── 3d/                       # 新規ディレクトリ

- [ ] 複数デバイスでの表示確認    ├── textures/             # テクスチャファイル

- [ ] パフォーマンステスト    └── materials/            # マテリアル設定

- [ ] 最終的な見た目調整```



## 参考情報## パフォーマンス考慮事項



**日本のこんぺいとうの特徴**:### メモリ使用量

- 丸い中央部分- **GLBファイルサイズ**: 目標 < 1MB

- 6-8個程度の小さな突起- **インスタンス数**: 最大100個まで対応

- 突起は比較的短く、丸みがある- **テクスチャ解像度**: 512x512px推奨

- 全体的に可愛らしい印象

### 読み込み速度

**Three.jsでの実装方針**:- **キャッシュ機能**: 初回読み込み後はメモリキャッシュ

- SphereGeometry + 少数のConeGeometry- **プリロード**: アプリ起動時にバックグラウンド読み込み

- 適度な不規則性で自然さを演出- **フォールバック**: 読み込み失敗時はOctahedronで代替

- シンプルで軽量な構造
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