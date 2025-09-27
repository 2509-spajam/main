import React, { useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

// グローバルのTHREE設定（Metro bundler要求）
(global as any).THREE = (global as any).THREE || THREE;

interface Compeito3DProps {
  style?: any;
}

export default function Compeito3D({ style }: Compeito3DProps) {
  const timeoutRef = useRef<number | null>(null);

  const onContextCreate = (gl: any) => {
    console.log('🍬 Creating 3D Compeito...');
    
    try {
      // 1. レンダラーセットアップ
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000000, 0); // 透明背景
      console.log('✅ Renderer setup complete');

      // 2. シーン作成
      const scene = new THREE.Scene();
      
      // 3. カメラ作成
      const camera = new THREE.PerspectiveCamera(
        75, 
        gl.drawingBufferWidth / gl.drawingBufferHeight, 
        0.1, 
        1000
      );
      camera.position.z = 3;

      // 4. コンペイトウ形状作成（Octahedron: 8面体）
      const geometry = new THREE.OctahedronGeometry(1, 0);
      
      // 5. マテリアル作成（金色、ライティング対応）
      const material = new THREE.MeshPhongMaterial({
        color: 0xFFD700, // 金色
        shininess: 100,
        specular: 0xFFFFFF,
      });

      // 6. メッシュ作成
      const compeito = new THREE.Mesh(geometry, material);
      scene.add(compeito);
      console.log('✅ Compeito mesh created');

      // 7. ライティング設定
      // 環境光
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);

      // 平行光源
      const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      console.log('✅ Lighting setup complete');

      // 8. アニメーションループ
      let animationId: number;
      const animate = () => {
        animationId = requestAnimationFrame(animate);

        // Y軸回転
        compeito.rotation.y += 0.02;
        
        // 上下浮遊（サイン波）
        compeito.position.y = Math.sin(Date.now() * 0.003) * 0.3;

        // レンダリング
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      animate();
      console.log('✅ 3D Compeito animation started!');

      // クリーンアップタイマー
      timeoutRef.current = window.setTimeout(() => {
        if (animationId) {
          cancelAnimationFrame(animationId);
          console.log('🧹 Animation cleaned up');
        }
      }, 1000 * 60 * 5); // 5分後

    } catch (error) {
      console.error('❌ Compeito3D error:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      
      // フォールバック表示
      try {
        console.log('🔄 Attempting fallback...');
        gl.clearColor(1, 0.84, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.endFrameEXP();
      } catch (fallbackError) {
        console.error('❌ Fallback failed:', fallbackError);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Webプラットフォームの場合はnullを返す（親コンポーネントがフォールバックを処理）
  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <GLView
      style={[{ width: 200, height: 200, borderRadius: 10 }, style]}
      onContextCreate={onContextCreate}
    />
  );
}