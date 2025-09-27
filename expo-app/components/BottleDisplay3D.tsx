import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Asset } from 'expo-asset';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';

// グローバルのTHREEオブジェクトを設定
(global as any).THREE = (global as any).THREE || THREE;

// 物理設定定数（スイカゲーム式スタッキング対応）
const PHYSICS_CONFIG = {
  gravity: -0.0008,
  restitution: 0.6,
  friction: 0.8,
  bottleRadius: 0.7,
  bottleBottom: -0.8,
  compeitoRadius: 0.12,
  compeitoCount: 40,
  
  // スタッキング用新パラメータ
  stackingThreshold: 0.8,    // 積み重ね判定閾値（半径比）
  restingVelocity: 1,    // 静止判定速度
  positionCorrection: 0.8,   // 位置補正強度（Matter.js準拠）
  constraintIterations: 2,   // 制約反復回数（安定性向上）
  positionIterations: 3,     // 位置補正反復回数
  
  // 摩擦・減速パラメータ
  airResistance: 0.999,      // 空気抵抗（常時適用される減速）
  contactFriction: 0.95,     // 接触摩擦（積み重ね時の強い摩擦）
  horizontalRestingVelocity: 0.0005,  // 横方向静止判定速度
  
  // 微振動防止パラメータ
  minBounceVelocity: 0.005,  // 最小バウンス速度（これ以下のバウンスを無視）
  dampingFactor: 0.95,       // 振動減衰係数（強い減衰）
  microMovementThreshold: 0.0001  // 微小動き闾値
};

interface CompeitoPhysics {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  radius: number;
  model: THREE.Object3D;
}

interface BottleDisplay3DProps {
  style?: any;
}

export default function BottleDisplay3D({ style }: BottleDisplay3DProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);  
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // クリーンアップ
  React.useEffect(() => {
    return () => {
      // アニメーションループを停止
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      // レンダラーを破棄
      if (rendererRef.current) {
        try {
          rendererRef.current.dispose();
        } catch (e) {
          console.warn('Renderer disposal warning:', e);
        }
      }
    };
  }, []);

  const onContextCreate = async (gl: any) => {
    try {
            // レンダラーの設定（Multisample関連機能を完全無効化）
      const renderer = new Renderer({ 
        gl,
        antialias: false,     // MSAA無効化
        stencil: false,       // ステンシルバッファ無効化
        depth: false,         // デプスバッファ無効化
        alpha: true,
        preserveDrawingBuffer: false,
        powerPreference: "low-power"
      });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000000, 0); // 透明な背景
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      
      // シャドウマッピングを無効化（パフォーマンス向上）
      renderer.shadowMap.enabled = false;
      
      rendererRef.current = renderer;

      // シーンの作成
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // カメラの設定
      const camera = new THREE.PerspectiveCamera(
        50,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0, 5);
      cameraRef.current = camera;

      // ライティング（expo-gl互換性を重視）
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
      directionalLight.position.set(5, 5, 5);
      directionalLight.castShadow = false; // シャドウを無効化
      scene.add(directionalLight);

      // 追加のライトで全体を明るく
      const light2 = new THREE.DirectionalLight(0xffffff, 0.3);
      light2.position.set(-5, -5, -5);
      scene.add(light2);

      // GLBモデルのロード（ボトル）
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bottleAsset = require('../assets/objs/bottle.glb');
      const [bottleAssetLoaded] = await Asset.loadAsync(bottleAsset);
      
      if (!bottleAssetLoaded.localUri) {
        throw new Error('Failed to get local URI from bottle asset');
      }
      
      const loader = new GLTFLoader();
      
      // ボトルモデルをロード
      const bottleGltf = await new Promise<any>((resolve, reject) => {
        loader.load(
          bottleAssetLoaded.localUri!,
          resolve,
          (progress: any) => {
            console.log('Bottle loading progress:', (progress.loaded / progress.total * 100) + '%');
          },
          reject
        );
      });

      // ボトルモデルをシーンに追加
      const bottleModel = bottleGltf.scene;
      
      // ボトルのサイズ調整
      const bottleBox = new THREE.Box3().setFromObject(bottleModel);
      const bottleSize = bottleBox.getSize(new THREE.Vector3());
      const bottleMaxDim = Math.max(bottleSize.x, bottleSize.y, bottleSize.z);
      const bottleScale = 2 / bottleMaxDim;
      bottleModel.scale.setScalar(bottleScale);

      // ボトルを中央に配置
      const bottleCenter = bottleBox.getCenter(new THREE.Vector3());
      bottleModel.position.sub(bottleCenter.multiplyScalar(bottleScale));

      scene.add(bottleModel);

      // コンペイトウモデルのロード
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const compeitoAsset = require('../assets/objs/conpeito.glb');
      const [compeitoAssetLoaded] = await Asset.loadAsync(compeitoAsset);
      
      if (!compeitoAssetLoaded.localUri) {
        throw new Error('Failed to get local URI from compeito asset');
      }
      
      // コンペイトウモデルをロード
      const compeitoGltf = await new Promise<any>((resolve, reject) => {
        loader.load(
          compeitoAssetLoaded.localUri!,
          resolve,
          (progress: any) => {
            console.log('Compeito loading progress:', (progress.loaded / progress.total * 100) + '%');
          },
          reject
        );
      });

      // ✅ 複数コンペイトウの物理システム
      const compeitos: CompeitoPhysics[] = [];
      
      // 複数コンペイトウの生成
      for (let i = 0; i < PHYSICS_CONFIG.compeitoCount; i++) {
        const compeitoInstance = compeitoGltf.scene.clone();
        
        // サイズ調整
        const compeitoScale = bottleScale * 0.2;
        compeitoInstance.scale.setScalar(compeitoScale);
        
        // より密な初期配置（多層配置）
        const layer = Math.floor(i / 5); // 5個ずつのレイヤー
        const indexInLayer = i % 5;
        const angle = (indexInLayer / 5) * Math.PI * 2 + layer * 0.5; // レイヤーごとに角度をずらす
        const radius = Math.random() * 0.4 + 0.1; // 0.1-0.5の範囲
        const initialX = Math.cos(angle) * radius;
        const initialZ = Math.sin(angle) * radius;
        const initialY = 1.2 + layer * 0.2 + Math.random() * 0.1; // レイヤー別の高さ
        
        compeitoInstance.position.set(initialX, initialY, initialZ);
        
        // パステルカラーを適用（より多くの色バリエーション）
        const colors = [
          0xFFB3BA, 0xFFDFBA, 0xBAE1FF, 0xBAFFBA, 0xFFBAFF,
          0xFFF2BA, 0xBAFFC9, 0xFFBAE1, 0xE1BAFF, 0xBAFFF2
        ];
        compeitoInstance.traverse((child: any) => {
          if (child.isMesh && child.material) {
            child.material = child.material.clone();
            child.material.color = new THREE.Color(colors[i % colors.length]);
          }
        });
        
        scene.add(compeitoInstance);
        
        // 物理データ作成（少し小さめの初期速度）
        compeitos.push({
          position: { x: initialX, y: initialY, z: initialZ },
          velocity: { 
            x: (Math.random() - 0.5) * 0.002, 
            y: 0, 
            z: (Math.random() - 0.5) * 0.002 
          },
          radius: PHYSICS_CONFIG.compeitoRadius,
          model: compeitoInstance
        });
      }

      // ✅ 物理シミュレーション関数群
      
      // ビン境界制約
      const constrainToBottle = (compeito: CompeitoPhysics) => {
        const BOTTLE_RADIUS = PHYSICS_CONFIG.bottleRadius;
        const BOTTLE_BOTTOM = PHYSICS_CONFIG.bottleBottom;
        
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
          compeito.velocity.x -= 2 * dot * nx * PHYSICS_CONFIG.restitution;
          compeito.velocity.z -= 2 * dot * nz * PHYSICS_CONFIG.restitution;
        }
        
        // 改善された底面衝突処理（微振動防止版）
        const groundLevel = BOTTLE_BOTTOM + compeito.radius;
        if (compeito.position.y <= groundLevel) {
          // 底面に正確に配置
          compeito.position.y = groundLevel;
          
          // 微小バウンス防止：速度が小さすぎる場合はバウンスせずに停止
          if (compeito.velocity.y < 0) {
            if (Math.abs(compeito.velocity.y) < PHYSICS_CONFIG.minBounceVelocity) {
              // 微小なバウンスは無視して完全停止
              compeito.velocity.y = 0;
            } else {
              // 通常のバウンスを適用（減衰係数で強めに減速）
              compeito.velocity.y = -compeito.velocity.y * PHYSICS_CONFIG.restitution * PHYSICS_CONFIG.dampingFactor;
            }
          }
          
          // 静止判定（さらに微小な振動を停止）
          if (Math.abs(compeito.velocity.y) < PHYSICS_CONFIG.restingVelocity) {
            compeito.velocity.y = 0;
          }
          
          // 水平摩擦適用
          compeito.velocity.x *= PHYSICS_CONFIG.friction;
          compeito.velocity.z *= PHYSICS_CONFIG.friction;
        }
      };
      
      // 垂直積み重ね処理（スイカゲーム式）
      const handleVerticalStacking = (a: CompeitoPhysics, b: CompeitoPhysics): boolean => {
        const dx = a.position.x - b.position.x;
        const dz = a.position.z - b.position.z;
        const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
        const radiusSum = a.radius + b.radius;
        
        // 水平距離が近い場合のみ垂直積み重ね処理
        if (horizontalDistance < radiusSum * PHYSICS_CONFIG.stackingThreshold) {
          const dy = a.position.y - b.position.y;
          const verticalDistance = Math.abs(dy);
          
          // 垂直方向の重なり判定
          if (verticalDistance < radiusSum) {
            // 上下の判定
            const upper = a.position.y > b.position.y ? a : b;
            const lower = a.position.y > b.position.y ? b : a;
            
            // 上のコンペイトウを適切な位置に配置（支え合う）
            const targetY = lower.position.y + lower.radius + upper.radius;
            const currentY = upper.position.y;
            
            if (currentY < targetY) {
              upper.position.y = targetY;
              
              // 上のコンペイトウの下向き速度を停止（静止）
              if (upper.velocity.y < 0) {
                // 微小な下向き速度は完全停止（微振動防止）
                if (Math.abs(upper.velocity.y) < PHYSICS_CONFIG.minBounceVelocity) {
                  upper.velocity.y = 0;
                } else {
                  upper.velocity.y = 0; // 積み重ね時はバウンスなしで完全停止
                }
              }
              
              // 積み重ね時の接触摩擦を適用（横方向の滑りを防ぐ）
              upper.velocity.x *= PHYSICS_CONFIG.contactFriction;
              upper.velocity.z *= PHYSICS_CONFIG.contactFriction;
              
              // 横方向の静止判定
              if (Math.abs(upper.velocity.x) < PHYSICS_CONFIG.horizontalRestingVelocity) {
                upper.velocity.x = 0;
              }
              if (Math.abs(upper.velocity.z) < PHYSICS_CONFIG.horizontalRestingVelocity) {
                upper.velocity.z = 0;
              }
            }
            
            return true; // 垂直スタッキング処理済み
          }
        }
        
        return false; // 水平衝突として処理
      };
      
      // コンペイトウ間衝突処理（統合版・スイカゲーム式）
      const handleCompeitoCollisions = () => {
        // 複数回の反復処理で安定性を向上（Matter.js方式）
        for (let iteration = 0; iteration < PHYSICS_CONFIG.constraintIterations; iteration++) {
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
                const distance = Math.sqrt(distanceSquared);
                
                if (distance > 0) {
                  // 垂直積み重ね処理を試行
                  if (handleVerticalStacking(a, b)) {
                    continue; // 垂直スタッキング処理済み
                  }
                  
                  // 水平衝突処理
                  const overlap = radiusSum - distance;
                  if (overlap > 0) {
                    // 正規化された方向ベクトル
                    const nx = dx / distance;
                    const ny = dy / distance;
                    const nz = dz / distance;
                    
                    // 位置補正（重なり解除・Matter.js準拠）
                    const correction = overlap * PHYSICS_CONFIG.positionCorrection * 0.5;
                    a.position.x += nx * correction;
                    a.position.y += ny * correction;
                    a.position.z += nz * correction;
                    
                    b.position.x -= nx * correction;
                    
                    // 相対速度の法線成分
                    const relativeVelX = a.velocity.x - b.velocity.x;
                    const relativeVelY = a.velocity.y - b.velocity.y;
                    const relativeVelZ = a.velocity.z - b.velocity.z;
                    
                    const velocityAlongNormal = relativeVelX * nx + relativeVelY * ny + relativeVelZ * nz;
                    
                    // 分離中なら処理不要
                    if (velocityAlongNormal > 0) continue;
                    
                    // 衝撃量計算
                    const impulse = -(1 + PHYSICS_CONFIG.restitution) * velocityAlongNormal;
                    const impulseScalar = impulse / 2; // 質量が同じと仮定
                    
                    // 速度更新
                    a.velocity.x += impulseScalar * nx;
                    a.velocity.y += impulseScalar * ny;
                    a.velocity.z += impulseScalar * nz;
                    
                    b.velocity.x -= impulseScalar * nx;
                    b.velocity.y -= impulseScalar * ny;
                    b.velocity.z -= impulseScalar * nz;
                  }
                }
              }
            }
          }
        }
      };
      
      let isAnimating = true;
      
      // メイン物理シミュレーションループ（スイカゲーム式）
      const animate = () => {
        if (!isAnimating) return;

        // すべてのコンペイトウに物理演算を適用
        compeitos.forEach(compeito => {
          // 重力適用
          compeito.velocity.y += PHYSICS_CONFIG.gravity;
          
          // 空気抵抗適用（常時減速・横方向の滑りを防ぐ）
          compeito.velocity.x *= PHYSICS_CONFIG.airResistance;
          compeito.velocity.z *= PHYSICS_CONFIG.airResistance;
          
          // 微小動き検出・完全停止システム（微振動防止）
          const totalVelocity = Math.sqrt(
            compeito.velocity.x * compeito.velocity.x + 
            compeito.velocity.y * compeito.velocity.y + 
            compeito.velocity.z * compeito.velocity.z
          );
          
          if (totalVelocity < PHYSICS_CONFIG.microMovementThreshold) {
            // 全ての微小動きを完全停止
            compeito.velocity.x = 0;
            compeito.velocity.y = 0;
            compeito.velocity.z = 0;
          } else {
            // 横方向の静止判定（微小な横移動を停止）
            if (Math.abs(compeito.velocity.x) < PHYSICS_CONFIG.horizontalRestingVelocity) {
              compeito.velocity.x = 0;
            }
            if (Math.abs(compeito.velocity.z) < PHYSICS_CONFIG.horizontalRestingVelocity) {
              compeito.velocity.z = 0;
            }
          }
          
          // 位置更新
          compeito.position.x += compeito.velocity.x;
          compeito.position.y += compeito.velocity.y;
          compeito.position.z += compeito.velocity.z;
          
          // ビン境界制約
          constrainToBottle(compeito);
        });
        
        // コンペイトウ同士衝突処理（スイカゲーム式）
        handleCompeitoCollisions();
        
        // 位置補正の追加反復（安定性向上）
        for (let correction = 0; correction < PHYSICS_CONFIG.positionIterations; correction++) {
          compeitos.forEach(compeito => {
            constrainToBottle(compeito);
          });
        }
        
        // 3Dモデル同期（最後に実行）
        compeitos.forEach(compeito => {
          compeito.model.position.copy(compeito.position);
        });
        
        // レンダリング
        try {
          rendererRef.current!.render(scene, camera);
          gl.endFrameEXP();
          
          // 次のフレームをリクエスト
          animationIdRef.current = requestAnimationFrame(animate);
        } catch (renderError) {
          console.error('❌ Animation render failed:', renderError);
          isAnimating = false;
        }
      };

      // 初回レンダリング後にアニメーション開始
      try {
        rendererRef.current.render(scene, camera);
        gl.endFrameEXP();
        console.log('✅ Initial render successful - starting multi-compeito animation');
        setIsLoading(false);
        
        // アニメーション開始（少し遅延して開始）
        setTimeout(() => {
          animate();
        }, 500);
        
      } catch (renderError) {
        console.error('❌ Initial render failed:', renderError);
        setHasError(true);
        setIsLoading(false);
      }
      
    } catch (error) {
      console.error('3D model loading error:', error);
      setHasError(true);
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>🍶</Text>
          <Text style={styles.errorSubText}>3D表示準備中</Text>
        </View>
      ) : (
        <GLView
          style={styles.glView}
          onContextCreate={onContextCreate}
        />
      )}
      {isLoading && !hasError && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  glView: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  errorText: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorSubText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
  },
});