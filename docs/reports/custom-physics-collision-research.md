# 独自物理エンジン実装調査レポート: コンペイトウ同士衝突判定

## 調査概要
コンペイトウの3Dビン落下シミュレーションにおける、コンペイトウ同士の衝突判定実装方法を調査。既存の軽量物理エンジン実装例を分析し、3Dでの応用可能性を検討。

## 既存実装の分析

### 1. シンプル2D物理エンジン実装 (j05t/javascript_physics)

**特徴:**
- A posteriori（事後）衝突検出方式
- Circle vs Circle 衝突判定のシンプル実装
- Sweep and Prune最適化による効率化

**核心コード:**
```javascript
// 衝突検出
Ball.prototype.detectCollision = function (ball) {
    var distX = ball.posX - this.posX;
    var distY = ball.posY - this.posY;
    var distance = distX * distX + distY * distY;
    
    if (distance <= BALL_DIAMETER * BALL_DIAMETER)
        return true;
    return false;
}

// 衝突解決
Ball.prototype.resolveCollision = function (ball) {
    // 1. オブジェクトを衝突前位置に戻す
    do {
        this.posX -= this.velX * 0.2;
        this.posY -= this.velY * 0.2;
        ball.posX -= ball.velX * 0.2;
        ball.posY -= ball.velY * 0.2;
    } while (distance < BALL_DIAMETER * BALL_DIAMETER);
    
    // 2. 法線ベクトル計算
    var nX = this.posX - ball.posX;
    var nY = this.posY - ball.posY;
    var norm = Math.sqrt(nX * nX + nY * nY);
    nX = nX / norm;
    nY = nY / norm;
    
    // 3. 運動量保存による速度更新
    var a1 = this.velX * nX + this.velY * nY;
    var a2 = ball.velX * nX + ball.velY * nY;
    var P = a1 - a2;
    
    this.velX = this.velX - P * nX;
    this.velY = this.velY - P * nY;
    ball.velX = ball.velX + P * nX;
    ball.velY = ball.velY + P * nY;
    
    // 4. 摩擦適用
    this.velX *= ROLLING_FRICTION;
    this.velY *= ROLLING_FRICTION;
}
```

**効率化手法:**
- **Insertion Sort**: X座標でソートしてSweep and Pruneを実現
- **Early Exit**: 距離が十分離れている場合は後続処理をスキップ

### 2. 3D衝突判定アルゴリズム (MDN)

#### 球体同士衝突判定（Sphere vs Sphere）
```javascript
function intersect(sphere, other) {
    const distance = Math.sqrt(
        (sphere.x - other.x) * (sphere.x - other.x) +
        (sphere.y - other.y) * (sphere.y - other.y) +
        (sphere.z - other.z) * (sphere.z - other.z),
    );
    return distance < sphere.radius + other.radius;
}

// 最適化版（平方根計算回避）
function intersectOptimized(sphere, other) {
    const distanceSquared = 
        (sphere.x - other.x) * (sphere.x - other.x) +
        (sphere.y - other.y) * (sphere.y - other.y) +
        (sphere.z - other.z) * (sphere.z - other.z);
    const radiusSumSquared = (sphere.radius + other.radius) * (sphere.radius + other.radius);
    return distanceSquared < radiusSumSquared;
}
```

#### AABB（軸平行境界ボックス）衝突判定
```javascript
function intersect(a, b) {
    return (
        a.minX <= b.maxX &&
        a.maxX >= b.minX &&
        a.minY <= b.maxY &&
        a.maxY >= b.minY &&
        a.minZ <= b.maxZ &&
        a.maxZ >= b.minZ
    );
}
```

### 3. Matter.js実装パターン

**高機能2D物理エンジンのコンセプト:**
- Engine + World + Bodies構造
- Broadphase（粗い衝突判定）+ Narrowphase（詳細衝突判定）
- Mouse制約によるインタラクション

**基本的な利用パターン:**
```javascript
const { Engine, World, Bodies } = Matter;
const engine = Engine.create();
const world = engine.world;

// 複数の物理オブジェクト
for (let i = 0; i < count; i++) {
    World.add(world, Bodies.circle(
        Math.random() * width, 
        Math.random() * height, 
        radius
    ));
}
```

## コンペイトウ向け3D衝突システム設計

### 1. アーキテクチャ

```typescript
interface CompeitoPhysics {
    position: { x: number, y: number, z: number };
    velocity: { x: number, y: number, z: number };
    radius: number;
    mass: number;
    restitution: number; // 反発係数
}

class CompeitoCollisionSystem {
    compeitos: CompeitoPhysics[] = [];
    
    // 毎フレーム実行
    update(deltaTime: number) {
        // 1. 重力・速度更新
        this.applyForces(deltaTime);
        
        // 2. 衝突検出
        const collisions = this.detectCollisions();
        
        // 3. 衝突解決
        this.resolveCollisions(collisions);
        
        // 4. 境界衝突（ボトル壁・底）
        this.handleBoundaryCollisions();
        
        // 5. 位置更新
        this.updatePositions(deltaTime);
    }
}
```

### 2. 核心的な実装ポイント

#### A. 効率的な衝突検出（Sphere vs Sphere）
```typescript
detectCollisions(): CollisionPair[] {
    const collisions: CollisionPair[] = [];
    
    // 効率化: 距離の二乗で比較（平方根計算回避）
    for (let i = 0; i < this.compeitos.length - 1; i++) {
        for (let j = i + 1; j < this.compeitos.length; j++) {
            const a = this.compeitos[i];
            const b = this.compeitos[j];
            
            const dx = a.position.x - b.position.x;
            const dy = a.position.y - b.position.y;
            const dz = a.position.z - b.position.z;
            const distanceSquared = dx*dx + dy*dy + dz*dz;
            
            const radiusSum = a.radius + b.radius;
            const radiusSumSquared = radiusSum * radiusSum;
            
            if (distanceSquared < radiusSumSquared) {
                collisions.push({ a, b, distance: Math.sqrt(distanceSquared) });
            }
        }
    }
    
    return collisions;
}
```

#### B. 3D衝突解決（運動量保存）
```typescript
resolveCollision(a: CompeitoPhysics, b: CompeitoPhysics, distance: number) {
    // 1. 正規化された衝突法線ベクトル計算
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    const dz = a.position.z - b.position.z;
    
    const nx = dx / distance;
    const ny = dy / distance;  
    const nz = dz / distance;
    
    // 2. 相対速度の法線成分
    const relativeVelX = a.velocity.x - b.velocity.x;
    const relativeVelY = a.velocity.y - b.velocity.y;
    const relativeVelZ = a.velocity.z - b.velocity.z;
    
    const velocityAlongNormal = 
        relativeVelX * nx + relativeVelY * ny + relativeVelZ * nz;
    
    // 3. オブジェクトが分離中なら処理不要
    if (velocityAlongNormal > 0) return;
    
    // 4. 反発係数による衝撃量計算
    const restitution = Math.min(a.restitution, b.restitution);
    const impulse = -(1 + restitution) * velocityAlongNormal;
    const massSum = a.mass + b.mass;
    const impulseScalar = impulse / massSum;
    
    // 5. 速度更新（運動量保存）
    a.velocity.x += impulseScalar * b.mass * nx;
    a.velocity.y += impulseScalar * b.mass * ny;
    a.velocity.z += impulseScalar * b.mass * nz;
    
    b.velocity.x -= impulseScalar * a.mass * nx;
    b.velocity.y -= impulseScalar * a.mass * ny;
    b.velocity.z -= impulseScalar * a.mass * nz;
    
    // 6. 位置補正（重なり解除）
    const overlap = a.radius + b.radius - distance;
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
```

#### C. ボトル境界衝突（円柱形状）
```typescript
handleBottleCollision(compeito: CompeitoPhysics) {
    const bottleRadius = 0.8;  // ボトル内半径
    const bottleBottom = -0.8; // ボトル底面
    const bottleTop = 1.0;     // ボトル上端
    
    // XZ平面での円柱境界チェック
    const distanceFromCenter = Math.sqrt(
        compeito.position.x * compeito.position.x + 
        compeito.position.z * compeito.position.z
    );
    
    if (distanceFromCenter + compeito.radius > bottleRadius) {
        // 壁面反射
        const nx = compeito.position.x / distanceFromCenter;
        const nz = compeito.position.z / distanceFromCenter;
        
        // 位置補正
        const targetDistance = bottleRadius - compeito.radius;
        compeito.position.x = nx * targetDistance;
        compeito.position.z = nz * targetDistance;
        
        // 速度反射
        const dotProduct = compeito.velocity.x * nx + compeito.velocity.z * nz;
        compeito.velocity.x -= 2 * dotProduct * nx;
        compeito.velocity.z -= 2 * dotProduct * nz;
        
        // 摩擦・反発係数適用
        compeito.velocity.x *= 0.8;
        compeito.velocity.z *= 0.8;
    }
    
    // 底面・上面衝突
    if (compeito.position.y - compeito.radius < bottleBottom) {
        compeito.position.y = bottleBottom + compeito.radius;
        compeito.velocity.y = -compeito.velocity.y * compeito.restitution;
    }
    
    if (compeito.position.y + compeito.radius > bottleTop) {
        compeito.position.y = bottleTop - compeito.radius;
        compeito.velocity.y = -compeito.velocity.y * compeito.restitution;
    }
}
```

### 3. 性能最適化戦略

#### A. 空間分割（Spatial Partitioning）
```typescript
class SpatialGrid {
    cellSize: number = 0.2; // セルサイズ
    grid: Map<string, CompeitoPhysics[]> = new Map();
    
    getCellKey(x: number, y: number, z: number): string {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        const cellZ = Math.floor(z / this.cellSize);
        return `${cellX},${cellY},${cellZ}`;
    }
    
    getNearbyObjects(compeito: CompeitoPhysics): CompeitoPhysics[] {
        const nearby: CompeitoPhysics[] = [];
        
        // 周囲27セル（3x3x3）をチェック
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const cellX = Math.floor((compeito.position.x + dx * this.cellSize) / this.cellSize);
                    const cellY = Math.floor((compeito.position.y + dy * this.cellSize) / this.cellSize);
                    const cellZ = Math.floor((compeito.position.z + dz * this.cellSize) / this.cellSize);
                    const key = `${cellX},${cellY},${cellZ}`;
                    
                    const cellObjects = this.grid.get(key) || [];
                    nearby.push(...cellObjects);
                }
            }
        }
        
        return nearby;
    }
}
```

#### B. 動的LOD（Level of Detail）
```typescript
// 遠い・小さいコンペイトウは簡略化
updateCompeito(compeito: CompeitoPhysics, cameraDistance: number) {
    if (cameraDistance > 5.0) {
        // 遠距離: 物理演算簡略化
        compeito.velocity.y += this.gravity * this.deltaTime;
        compeito.position.y += compeito.velocity.y * this.deltaTime;
        // 衝突判定はスキップ
    } else {
        // 近距離: フル物理演算
        this.fullPhysicsUpdate(compeito);
    }
}
```

## 実装複雑度とパフォーマンス評価

| 機能レベル | 実装時間 | CPU負荷 | メモリ使用量 | 視覚効果 |
|------------|----------|---------|--------------|----------|
| **Level 1**: 単体落下 | 15分 | 極小 | 極小 | ○ |
| **Level 2**: 境界反発 | +30分 | 小 | 小 | ○ |
| **Level 3**: 複数落下（衝突なし） | +1時間 | 中 | 中 | ○ |
| **Level 4**: コンペイトウ間衝突 | +4時間 | 大 | 大 | ◎ |
| **Level 5**: 最適化済み衝突 | +8時間 | 中 | 中 | ◎ |

## 推奨実装アプローチ

### 段階的実装戦略

**Phase 1 (即座実装可能):** 単体物理演算
```typescript
// 既存のBottleDisplay3D.tsxに最小追加
const compeitos = [{
    position: { x: 0, y: 0.5, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    radius: 0.05
}];

function updatePhysics() {
    compeitos[0].velocity.y -= 0.001; // 重力
    compeitos[0].position.y += compeitos[0].velocity.y;
    
    // 底面反発
    if (compeitos[0].position.y < -0.8) {
        compeitos[0].position.y = -0.8;
        compeitos[0].velocity.y *= -0.7;
    }
}
```

**Phase 2 (余裕があれば):** 複数オブジェクト
- 5-10個のコンペイトウ
- 簡単なランダム配置
- 個別の重力・反発処理

**Phase 3 (高度機能):** 衝突判定実装
- Sphere vs Sphere検出
- 基本的な運動量保存
- ボトル壁面衝突

**Phase 4 (最適化):** 性能改善
- 空間分割導入
- 動的LOD適用
- メモリプール活用

## 結論

**現実的な判断:**
1. **Level 3まで**なら比較的簡単に実装可能（2-3時間）
2. **Level 4の衝突判定**は複雑だが技術的に実現可能（+4-6時間）
3. **最も効果的**: Phase 1での単体物理演算から段階的に拡張

**技術的リスク:**
- 3D計算の複雑性
- Three.js統合の難しさ
- モバイル端末での性能制約

**推奨方針:**
MVP（最小実用版）としてLevel 3まで実装し、余裕があればLevel 4の衝突判定に挑戦する段階的アプローチが最適。