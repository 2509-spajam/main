import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Asset } from 'expo-asset';

// グローバルのTHREEオブジェクトを設定
(global as any).THREE = (global as any).THREE || THREE;

interface BottleDisplay3DProps {
  style?: any;
}

export default function BottleDisplay3D({ style }: BottleDisplay3DProps) {
  const [isLoading, setIsLoading] = useState(true);
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // クリーンアップ
  React.useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  const onContextCreate = async (gl: any) => {
    try {
      // レンダラーの設定（アンチエイリアシングを無効化）
      const renderer = new Renderer({ 
        gl,
        antialias: false,
        alpha: true,
        preserveDrawingBuffer: true
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

      // アニメーションループ
      const animate = () => {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          try {
            // ゆっくりと回転
            model.rotation.y += 0.005;
            
            // レンダリング（エラーハンドリング付き）
            rendererRef.current.render(sceneRef.current, cameraRef.current);
            gl.endFrameEXP();
            
          } catch (renderError) {
            console.warn('Render warning:', renderError);
            // レンダリングエラーが発生しても継続
          }
          
          animationIdRef.current = requestAnimationFrame(animate);
        }
      };
      
      animate();
      
    } catch (error) {
      console.error('3D model loading error:', error);
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          {/* ローディング表示は必要に応じて追加 */}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});