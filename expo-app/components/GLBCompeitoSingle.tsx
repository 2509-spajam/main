import React, { useRef, useCallback, useEffect } from 'react';
import { View, Platform, StyleSheet, Text } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Asset } from 'expo-asset';

// グローバルのTHREEオブジェクトを設定（Metro bundler要求）
(global as any).THREE = (global as any).THREE || THREE;

// パステルカラーパレット（より白っぽく調整）
const PASTEL_COLORS = [
  new THREE.Color(0xFFDDE6), // ピンク
  new THREE.Color(0xFFEFDD), // ピーチ
  new THREE.Color(0xFFFEDD), // イエロー
  new THREE.Color(0xE8FFE8), // グリーン
  new THREE.Color(0xE8F4FF), // ブルー
  new THREE.Color(0xF0E8FF), // パープル
];

// ランダムパステルカラーを適用
const applyRandomPastelColor = (model: THREE.Group) => {
  const color = PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
  model.traverse((child: any) => {
    if (child.isMesh && child.material) {
      child.material = child.material.clone();
      child.material.color = color;
      child.material.transparent = true;
      child.material.opacity = 0.95;
      
      // 自発光で明るさを向上
      child.material.emissive = color.clone().multiplyScalar(0.1);
      
      if (child.material.shininess !== undefined) {
        child.material.shininess = 30;
      }
      if (child.material.specular !== undefined) {
        child.material.specular = new THREE.Color(0x222222);
      }
    }
  });
};

interface GLBCompeitoSingleProps {
  size?: number;
  rotationSpeed?: number;
  color?: THREE.Color;
  style?: any;
}

export default function GLBCompeitoSingle({
  size = 0.5,
  rotationSpeed = 0.02,
  color,
  style
}: GLBCompeitoSingleProps) {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const compeitoRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number | null>(null);

  // GLBモデルを読み込む関数
  const loadGLBModel = useCallback(async (): Promise<THREE.Group | null> => {
    try {
      console.log('🔄 Loading GLB model for single compeito...');
      
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const glbAsset = require('../assets/objs/conpeito.glb');
      
      const [asset] = await Asset.loadAsync(glbAsset);
      if (!asset.localUri) {
        throw new Error('Failed to get local URI from asset');
      }
      
      return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(
          asset.localUri!,
          (gltf: any) => {
            console.log('✅ GLB model loaded for single compeito');
            resolve(gltf.scene);
          },
          (progress: any) => {
            console.log('Loading progress:', progress);
          },
          (error: any) => {
            console.error('❌ GLB loading error:', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('❌ Failed to load GLB model:', error);
      return null;
    }
  }, []);

  const onContextCreate = useCallback(async (gl: any) => {
    try {
      console.log('🎮 Initializing single compeito scene...');
      
      // 1. レンダラーセットアップ
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000000, 0);
      rendererRef.current = renderer;

      // 2. シーン作成
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // 3. カメラセットアップ（こんぺいとうを美しく映すアングル）
      const camera = new THREE.PerspectiveCamera(
        50,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        100
      );
      camera.position.set(1.5, 1.5, 2.5); // 斜め上からの美しいアングル
      camera.lookAt(0, 0, 0);

                  // 4. ライティング（こんぺいとうを美しく照らす）
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // 環境光を強化
      scene.add(ambientLight);
      
      // メインライト（正面から）
      const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
      mainLight.position.set(2, 3, 2);
      scene.add(mainLight);
      
      // サブライト（左から）
      const sideLight = new THREE.DirectionalLight(0x87ceeb, 0.4);
      sideLight.position.set(-2, 1, 1);
      scene.add(sideLight);
      
      // リムライト（後ろから輪郭強調）
      const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
      rimLight.position.set(-1, -1, -2);
      scene.add(rimLight);

      // 5. GLBモデル読み込み
      const glbModel = await loadGLBModel();
      if (glbModel) {
        const compeito = glbModel.clone();
        
        // パステルカラーを適用
        if (color) {
          // 指定色がある場合
          compeito.traverse((child: any) => {
            if (child.isMesh && child.material) {
              child.material = child.material.clone();
              child.material.color = color;
              child.material.transparent = true;
              child.material.opacity = 0.95;
              
              // 自発光で明るさを向上
              child.material.emissive = color.clone().multiplyScalar(0.1);
              
              if (child.material.shininess !== undefined) {
                child.material.shininess = 30;
              }
              if (child.material.specular !== undefined) {
                child.material.specular = new THREE.Color(0x222222);
              }
            }
          });
        } else {
          // ランダムパステルカラー
          applyRandomPastelColor(compeito);
        }
        
        // サイズ調整
        compeito.scale.setScalar(size);
        
        // 位置調整（中央に配置）
        compeito.position.set(0, 0, 0);
        
        scene.add(compeito);
        compeitoRef.current = compeito;
        
        console.log('✅ Single compeito ready for display');
      }

      // 6. 美しい回転アニメーション
      const animate = () => {
        if (rendererRef.current && sceneRef.current && compeitoRef.current) {
          // ゆっくりとした美しい回転
          compeitoRef.current.rotation.y += rotationSpeed;
          compeitoRef.current.rotation.x += rotationSpeed * 0.3;
          compeitoRef.current.rotation.z += rotationSpeed * 0.1;
          
          rendererRef.current.render(scene, camera);
          gl.endFrameEXP();
        }
        animationRef.current = requestAnimationFrame(animate);
      };

      animate();

    } catch (error) {
      console.error('❌ Single compeito initialization error:', error);
    }
  }, [size, rotationSpeed, color, loadGLBModel]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // プラットフォーム対応
  if (Platform.OS !== 'web' && Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <View style={styles.fallbackCompeito}>
          <Text style={styles.fallbackText}>⭐</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  glView: {
    flex: 1,
    borderRadius: 15,
  },
  fallbackContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 15,
  },
  fallbackCompeito: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  fallbackText: {
    fontSize: 60,
    textAlign: 'center',
  },
});