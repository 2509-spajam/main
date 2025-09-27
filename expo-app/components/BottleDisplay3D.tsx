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

interface BottleDisplay3DProps {
  style?: any;
}

export default function BottleDisplay3D({ style }: BottleDisplay3DProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);  
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // クリーンアップ
  React.useEffect(() => {
    return () => {
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

      // コンペイトウモデルをシーンに追加
      const compeitoModel = compeitoGltf.scene.clone();
      
      // コンペイトウのサイズ調整（小さく）
      const compeitoScale = bottleScale * 0.1; // ボトルの1/10サイズ
      compeitoModel.scale.setScalar(compeitoScale);
      
      // コンペイトウをボトルの少し前に配置
      compeitoModel.position.set(0, -0.3, 0.5);
      
      // パステルピンク色を適用
      compeitoModel.traverse((child: any) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.color = new THREE.Color(0xFFB3BA); // パステルピンク
        }
      });

      scene.add(compeitoModel);

      // 静的表示（アニメーションなし）でテスト
      try {
        // 初期レンダリングのみ
        rendererRef.current.render(scene, camera);
        gl.endFrameEXP();
        console.log('✅ Static render successful');
        setIsLoading(false);
      } catch (renderError) {
        console.error('❌ Static render failed:', renderError);
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