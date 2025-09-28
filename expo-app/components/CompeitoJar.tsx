import React, { useRef } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';

// グローバルのTHREE設定（Metro bundler要求）
(global as any).THREE = (global as any).THREE || THREE;

interface CompeitoJarProps {
  count: number; // こんぺいとうの数 (1-100)
  size?: 'small' | 'medium' | 'large'; // ビンサイズ
  animated?: boolean; // アニメーション有効
  style?: any;
  showCount?: boolean; // 数の表示
}

export default function CompeitoJar({ 
  count, 
  size = 'medium', 
  animated = true, 
  style,
  showCount = true 
}: CompeitoJarProps) {
  const timeoutRef = useRef<number | null>(null);
  
  // サイズ設定
  const sizeConfig = {
    small: { jarRadius: 0.8, jarHeight: 1.8, compeitoSize: 0.08 },
    medium: { jarRadius: 1.0, jarHeight: 2.2, compeitoSize: 0.1 },
    large: { jarRadius: 1.2, jarHeight: 2.6, compeitoSize: 0.12 }
  };
  
  const config = sizeConfig[size];

  // こんぺいとうの配置計算
  const generateCompeitoPositions = (count: number, jarRadius: number, jarHeight: number) => {
    const positions: { x: number; y: number; z: number; rotation: { x: number; y: number; z: number } }[] = [];
    
    for (let i = 0; i < count; i++) {
      const layer = Math.floor(i / 8);
      const indexInLayer = i % 8;
      
      // 層の高さ計算
      const layerY = -jarHeight / 2 + 0.2 + layer * 0.25;
      
      // 円形配置 + ランダム要素
      const angle = (indexInLayer / 8) * Math.PI * 2;
      const radiusVariation = Math.random() * 0.3;
      const currentRadius = (jarRadius - 0.2) * (0.7 + radiusVariation);
      
      const x = Math.cos(angle) * currentRadius + (Math.random() - 0.5) * 0.2;
      const z = Math.sin(angle) * currentRadius + (Math.random() - 0.5) * 0.2;
      const y = layerY + (Math.random() - 0.5) * 0.1;
      
      // ランダム回転
      const rotation = {
        x: Math.random() * Math.PI,
        y: Math.random() * Math.PI,
        z: Math.random() * Math.PI
      };
      
      positions.push({ x, y, z, rotation });
    }
    
    return positions;
  };

  const onContextCreate = (gl: any) => {
    console.log(`🍯 Creating CompeitoJar with ${count} compeitos...`);
    
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
      camera.position.set(0, 0.5, 3.5);
      camera.lookAt(0, 0, 0);

      // 4. ビン（容器）作成
      const jarGeometry = new THREE.CylinderGeometry(
        config.jarRadius,     // 上部半径
        config.jarRadius * 0.9, // 下部半径（わずかに細く）
        config.jarHeight,     // 高さ
        32,                   // 円周分割数
        1,                    // 高さ分割数
        true                  // 開口部（上が開いている）
      );
      
      const jarMaterial = new THREE.MeshPhongMaterial({
        color: 0xDDDDDD,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        shininess: 30
      });

      const jar = new THREE.Mesh(jarGeometry, jarMaterial);
      scene.add(jar);
      console.log('✅ Jar created');

      // 5. こんぺいとう作成（InstancedMesh使用）
      if (count > 0) {
        const compeitoGeometry = new THREE.OctahedronGeometry(config.compeitoSize, 0);
        const compeitoMaterial = new THREE.MeshPhongMaterial({
          color: 0xFFD700, // 金色
          shininess: 100,
          specular: 0xFFFFFF,
        });

        const instancedMesh = new THREE.InstancedMesh(
          compeitoGeometry, 
          compeitoMaterial, 
          count
        );

        // 位置設定
        const positions = generateCompeitoPositions(count, config.jarRadius, config.jarHeight);
        const matrix = new THREE.Matrix4();
        
        positions.forEach((pos, index) => {
          matrix.identity();
          matrix.makeRotationFromEuler(new THREE.Euler(pos.rotation.x, pos.rotation.y, pos.rotation.z));
          matrix.setPosition(pos.x, pos.y, pos.z);
          instancedMesh.setMatrixAt(index, matrix);
        });
        
        instancedMesh.instanceMatrix.needsUpdate = true;
        scene.add(instancedMesh);
        console.log(`✅ ${count} compeitos created`);
      }

      // 6. ライティング設定
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // パステルカラー改善（白色光＋適切な明度）
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.0);
      directionalLight.position.set(2, 3, 2);
      scene.add(directionalLight);

      const directionalLight2 = new THREE.DirectionalLight(0xFFD700, 0.5);
      directionalLight2.position.set(-1, 2, -1);
      scene.add(directionalLight2);
      console.log('✅ Lighting setup complete');

      // 7. アニメーション（オプション）
      let animationId: number;
      if (animated) {
        const animate = () => {
          animationId = requestAnimationFrame(animate);

          // 全体をゆっくり回転
          scene.rotation.y += 0.005;

          renderer.render(scene, camera);
          gl.endFrameEXP();
        };
        animate();
        console.log('✅ Animation started');
      } else {
        // 静止画レンダリング
        renderer.render(scene, camera);
        gl.endFrameEXP();
        console.log('✅ Static render complete');
      }

      // クリーンアップ
      timeoutRef.current = window.setTimeout(() => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      }, 1000 * 60 * 5); // 5分後

    } catch (error) {
      console.error('❌ CompeitoJar error:', error);
    }
  };

  // Webプラットフォームの場合はフォールバック
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <View style={styles.fallbackJar}>
          <Text style={styles.fallbackJarText}>🍯</Text>
          {showCount && <Text style={styles.countText}>{count}個</Text>}
        </View>
        <Text style={styles.fallbackLabel}>コンペイトウ貯金</Text>
        <Text style={styles.fallbackSubText}>モバイルで3D表示</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
      {showCount && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>{count}個</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glView: {
    width: 250,
    height: 300,
    borderRadius: 15,
  },
  countContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  countText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallbackJar: {
    width: 200,
    height: 240,
    backgroundColor: colors.surface,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.reward.gold,
    position: 'relative',
  },
  fallbackJarText: {
    fontSize: 60,
    marginBottom: 10,
  },
  fallbackLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 8,
  },
  fallbackSubText: {
    ...typography.caption,
    color: colors.text.light,
    fontSize: 10,
  },
});