import React, { useRef, useEffect } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { colors } from '../styles/colors';

// グローバルのTHREE設定（Metro bundler要求）
(global as any).THREE = (global as any).THREE || THREE;

interface Basic3DCubeProps {
  style?: any;
}

export default function Basic3DCube({ style }: Basic3DCubeProps) {
  const timeoutRef = useRef<number | null>(null);

  const onContextCreate = (gl: any) => {
    console.log('🎲 Creating basic 3D cube...');
    
    try {
      // 1. レンダラーセットアップ
      console.log('📦 Setting up renderer...');
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000000, 0); // 透明背景
      console.log('✅ Renderer created');

      // 2. シーン作成
      console.log('🌟 Creating scene...');
      const scene = new THREE.Scene();
      
      // 3. カメラ作成
      const camera = new THREE.PerspectiveCamera(
        75, // fov
        gl.drawingBufferWidth / gl.drawingBufferHeight, // aspect
        0.1, // near
        1000 // far
      );
      camera.position.z = 3;
      console.log('📷 Camera created');

      // 4. ジオメトリとマテリアル作成
      console.log('📐 Creating geometry and material...');
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xFFD700, // 金色
        wireframe: false 
      });
      console.log('✅ Geometry and material created');

      // 5. メッシュ作成
      console.log('🎯 Creating mesh...');
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      console.log('✅ Mesh added to scene');

      // 6. アニメーションループ
      console.log('🎬 Starting animation...');
      let animationId: number;
      const animate = () => {
        animationId = requestAnimationFrame(animate);

        // 回転アニメーション
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        // レンダリング
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      animate();
      console.log('✅ 3D cube animation started!');

      // クリーンアップタイマー
      timeoutRef.current = window.setTimeout(() => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      }, 1000 * 60 * 5); // 5分後

    } catch (error) {
      console.error('❌ Basic3DCube error:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      
      // フォールバック表示
      try {
        console.log('🔄 Attempting fallback rendering...');
        gl.clearColor(1, 0.84, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.endFrameEXP();
        console.log('✅ Fallback successful');
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

  // Webプラットフォームの場合はフォールバック
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>3D Cube</Text>
        <Text style={styles.fallbackSubText}>Web Preview</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
      <Text style={styles.label}>3D Cube</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glView: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    color: colors.text.secondary,
  },
  fallback: {
    width: 200,
    height: 200,
    backgroundColor: colors.reward.gold,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  fallbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  fallbackSubText: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
});