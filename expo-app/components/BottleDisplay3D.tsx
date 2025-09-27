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

      // GLBモデルのロード
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bottleAsset = require('../assets/objs/bottle.glb');
      const [asset] = await Asset.loadAsync(bottleAsset);
      
      if (!asset.localUri) {
        throw new Error('Failed to get local URI from asset');
      }
      
      const loader = new GLTFLoader();
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(
          asset.localUri!,
          resolve,
          (progress: any) => {
            console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
          },
          reject
        );
      });

      // モデルをシーンに追加
      const model = gltf.scene;
      
      // モデルのサイズ調整
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      model.scale.setScalar(scale);

      // モデルを中央に配置
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center.multiplyScalar(scale));

      scene.add(model);
      setIsLoading(false);

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