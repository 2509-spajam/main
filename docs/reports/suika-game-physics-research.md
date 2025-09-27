# スイカゲーム物理エンジン実装調査レポート

## 調査概要
現在の物理エンジンは疑似的な衝突再現で、縦方向の当たり判定が甘く、オブジェクトが重なって沈む問題がある。スイカゲームのように「互いが支え合って安定する」物理挙動を実現するための実装方法を調査した。

## 現状の問題点
- **疑似的衝突検出**: 現在のCompeitoJarでは静的な位置配置のみ
- **縦方向の当たり判定不足**: 重力落下時にオブジェクトが重なって沈む
- **支え合う物理なし**: オブジェクト同士の相互作用が不十分

## スイカゲーム式物理エンジンの核心要素

### 1. 安定したスタッキング（Stable Stacking）
スイカゲームで重要なのは「安定したスタッキング」機能で、これはMatter.jsで "Stable stacking and resting" として実装されている。

**核心技術:**
- **事後衝突検出（A posteriori collision detection）**: 衝突が発生した後に補正
- **位置補正システム**: 重なった物体を物理的に適切な位置に押し戻す
- **運動量保存**: 衝突時の物理法則に基づく速度変更
- **摩擦・反発係数**: 現実的な物理挙動

### 2. Matter.jsの実装パターン
```javascript
const { Engine, World, Bodies } = Matter;
const engine = Engine.create();
const world = engine.world;

// 重要設定
engine.world.gravity.y = 1;  // 重力
engine.constraintIterations = 2;  // 制約反復（安定性）
engine.positionIterations = 6;    // 位置補正反復

// 物理オブジェクト作成
const bodies = [];
for (let i = 0; i < count; i++) {
    bodies.push(Bodies.circle(x, y, radius, {
        restitution: 0.3,  // 反発係数
        friction: 0.4,     // 摩擦
        density: 0.001     // 密度
    }));
}
World.add(world, bodies);
```

### 3. 3D実装への応用

#### A. 球体間衝突検出（Sphere vs Sphere）
```typescript
function detectSphereSphereCollision(a: CompeitoPhysics, b: CompeitoPhysics): boolean {
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    const dz = a.position.z - b.position.z;
    const distanceSquared = dx*dx + dy*dy + dz*dz;
    
    const radiusSum = a.radius + b.radius;
    const radiusSumSquared = radiusSum * radiusSum;
    
    return distanceSquared < radiusSumSquared;
}
```

#### B. 3D衝突解決（スイカゲーム式）
```typescript
function resolveCollision(a: CompeitoPhysics, b: CompeitoPhysics) {
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    const dz = a.position.z - b.position.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // 1. 正規化された法線ベクトル
    const nx = dx / distance;
    const ny = dy / distance;
    const nz = dz / distance;
    
    // 2. 相対速度の法線成分
    const relativeVel = {
        x: a.velocity.x - b.velocity.x,
        y: a.velocity.y - b.velocity.y,
        z: a.velocity.z - b.velocity.z
    };
    
    const velocityAlongNormal = 
        relativeVel.x * nx + relativeVel.y * ny + relativeVel.z * nz;
    
    // 分離中なら処理不要
    if (velocityAlongNormal > 0) return;
    
    // 3. 反発係数を考慮した衝撃量計算
    const restitution = Math.min(a.restitution, b.restitution);
    const impulse = -(1 + restitution) * velocityAlongNormal;
    const massSum = a.mass + b.mass;
    const impulseScalar = impulse / massSum;
    
    // 4. 速度更新（運動量保存）
    a.velocity.x += impulseScalar * b.mass * nx;
    a.velocity.y += impulseScalar * b.mass * ny;
    a.velocity.z += impulseScalar * b.mass * nz;
    
    b.velocity.x -= impulseScalar * a.mass * nx;
    b.velocity.y -= impulseScalar * a.mass * ny;
    b.velocity.z -= impulseScalar * a.mass * nz;
    
    // 5. 位置補正（重なり解除）- スイカゲームの核心
    const overlap = a.radius + b.radius - distance;
    if (overlap > 0) {
        const correctionPercent = 0.8; // 80%補正
        const correctionX = overlap * correctionPercent * nx / massSum;
        const correctionY = overlap * correctionPercent * ny / massSum;
        const correctionZ = overlap * correctionPercent * nz / massSum;
        
        a.position.x += correctionX * b.mass;
        a.position.y += correctionY * b.mass;
        a.position.z += correctionZ * b.mass;
        
        b.position.x -= correctionX * a.mass;
        b.position.y -= correctionY * a.mass;
        b.position.z -= correctionZ * a.mass;
    }
}
```

#### C. 安定性のための反復処理
```typescript
class CompeitoPhysicsEngine {
    constraintIterations = 2;  // Matter.js標準値
    positionIterations = 6;    // Matter.js標準値
    
    update(deltaTime: number) {
        // 1. 重力・外力適用
        this.applyForces(deltaTime);
        
        // 2. 制約反復（安定性向上）
        for (let i = 0; i < this.constraintIterations; i++) {
            const collisions = this.detectCollisions();
            this.resolveCollisions(collisions);
        }
        
        // 3. 位置補正反復（重なり解除）
        for (let i = 0; i < this.positionIterations; i++) {
            this.correctPositions();
        }
        
        // 4. 最終位置更新
        this.updatePositions(deltaTime);
    }
}
```

## Box2Dからの学び

Box2D（Matter.jsの基盤）の核心概念:
- **Rigid Body**: 剛体物理学
- **Contact Constraint**: 接触制約（自動生成）
- **Joint Constraint**: 結合制約
- **Solver**: 物理ソルバー（反復計算による安定化）

重要なのは「Contact Constraint」で、これが物体同士の接触を処理し、互いに支え合う挙動を実現する。

## 実装推奨アプローチ

### Phase 1: 基本物理フレームワーク構築（2-3時間）
```typescript
interface CompeitoPhysics {
    position: Vector3;
    velocity: Vector3;
    radius: number;
    mass: number;
    restitution: number;  // 反発係数
    friction: number;     // 摩擦係数
}

class CompeitoPhysicsWorld {
    compeitos: CompeitoPhysics[] = [];
    gravity = { x: 0, y: -9.8, z: 0 };
    
    update(deltaTime: number) {
        this.applyGravity(deltaTime);
        this.resolveCollisions();
        this.updatePositions(deltaTime);
    }
}
```

### Phase 2: 衝突検出システム（3-4時間）
- Broad Phase: 空間分割による効率化
- Narrow Phase: 詳細な衝突判定
- Collision Response: スイカゲーム式解決

### Phase 3: 安定化システム（2-3時間）
- 反復計算による位置補正
- 制約ソルバーの実装
- 摩擦・反発係数の調整

## 期待される効果

### ✅ 解決される問題
1. **縦方向の当たり判定**: 正確な球体衝突検出
2. **重なり解除**: 位置補正による物理的分離
3. **支え合い**: 運動量保存による安定したスタッキング
4. **現実的物理**: 摩擦・反発による自然な挙動

### ⚠️ 実装上の課題
1. **性能負荷**: 反復計算による負荷増加
2. **調整の複雑さ**: 物理パラメータの微調整が必要
3. **デバッグ困難**: 物理計算の問題特定が困難

## 結論

スイカゲームの「互いが支え合って安定する」物理挙動は、主に以下の3つの技術で実現されている：

1. **正確な衝突検出**: 球体間の距離計算
2. **位置補正システム**: 重なりを物理的に解決
3. **反復計算**: 安定性を保つための複数回処理

現在のプロジェクトでは、Phase 1の基本物理フレームワークから段階的に実装し、必要に応じてPhase 2-3を追加する方針が適切と判断される。

## 次ステップ
1. CompeitoPhysics インターフェースの定義
2. 基本的な重力・衝突検出の実装
3. Three.js統合によるビジュアル確認
4. 物理パラメータの調整とテスト

## 参考資料
- Matter.js Documentation: https://brm.io/matter-js/docs/
- Box2D Documentation: https://box2d.org/documentation/
- 3D Collision Detection (MDN): Sphere vs Sphere collision algorithms
- Custom Physics Implementation Research: ../custom-physics-collision-research.md