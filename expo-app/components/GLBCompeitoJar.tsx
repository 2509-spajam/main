import React, { useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, Platform, StyleSheet, PanResponder } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';

// グローバルのTHREEオブジェクトを設定（Metro bundler要求）
(global as any).THREE = (global as any).THREE || THREE;

// カスタムこんぺいとうモデルのキャッシュクラス
class CustomCompeitoCache {
  private static models: Map<number, THREE.Group> = new Map();
  
  static getModel(size: number): THREE.Group {
    if (!this.models.has(size)) {
      this.models.set(size, this.createCustomCompeito(size));
    }
    return this.models.get(size)!.clone();
  }
  
  private static createCustomCompeito(size: number): THREE.Group {
    const group = new THREE.Group();
    
    // 中央のコア（星形）
    const starGeometry = new THREE.ConeGeometry(size * 0.8, size * 1.2, 5);
    const starMaterial = new THREE.MeshPhongMaterial({
      color: 0xff69b4,
      shininess: 100,
      transparent: true,
      opacity: 0.9
    });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    group.add(star);
    
    // 装飾的な小さなスパイク
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spikeGeometry = new THREE.ConeGeometry(size * 0.2, size * 0.6, 4);
      const spikeMaterial = new THREE.MeshPhongMaterial({
        color: 0xff1493,
        shininess: 50
      });
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
      
      spike.position.x = Math.cos(angle) * size * 0.7;
      spike.position.z = Math.sin(angle) * size * 0.7;
      spike.rotation.z = angle;
      
      group.add(spike);
    }
    
    return group;
  }
}

interface CompeitoJarProps {
  count?: number;
  jarRadius?: number;
  jarHeight?: number;
  compeitoSize?: number;
  jarColor?: number;
  maxCompeitos?: number;
  onCompeitoAdd?: (newCount: number) => void;
  interactive?: boolean;
  showCount?: boolean;
  style?: any;
}

export default function GLBCompeitoJar({
  count = 0,
  jarRadius = 1.2,
  jarHeight = 2.0,
  compeitoSize = 0.08,
  jarColor = 0x87ceeb,
  maxCompeitos = 100,
  onCompeitoAdd,
  interactive = false,
  showCount = true,
  style
}: CompeitoJarProps) {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const compeitosRef = useRef<THREE.Object3D[]>([]);
  
  const [currentCount, setCurrentCount] = useState(count);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const config = useMemo(() => ({
    jarRadius: jarRadius * 0.9,
    jarHeight: jarHeight * 0.9,
    compeitoSize: compeitoSize,
    jarColor: jarColor,
    maxCompeitos: maxCompeitos
  }), [jarRadius, jarHeight, compeitoSize, jarColor, maxCompeitos]);

  const animationRef = useRef<number | null>(null);
  const compeitoModel = CustomCompeitoCache.getModel(config.compeitoSize);

  const generateCompeitoPositions = useCallback((count: number) => {
    const positions = [];
    const baseRadius = config.jarRadius * 0.8;
    
    for (let i = 0; i < count; i++) {
      const layer = Math.floor(i / 8);
      const positionInLayer = i % 8;
      const angleStep = (Math.PI * 2) / 8;
      const angle = positionInLayer * angleStep + layer * 0.3;
      const radius = baseRadius * (0.6 + Math.random() * 0.4);
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -config.jarHeight / 2 + 0.2 + layer * 0.25 + Math.random() * 0.1;
      
      positions.push({
        x, y, z,
        rotation: {
          x: Math.random() * Math.PI,
          y: Math.random() * Math.PI,
          z: Math.random() * Math.PI
        }
      });
    }
    
    return positions;
  }, [config]);

  const addCompeitoAtPosition = useCallback((x: number, z: number) => {
    if (!sceneRef.current || isAnimating) return;
    
    console.log(`🍬 Adding custom compeito at (${x.toFixed(2)}, ${z.toFixed(2)})`);
    setIsAnimating(true);

    // カスタムこんぺいとうモデルから新しいこんぺいとう作成
    const newCompeito = compeitoModel.clone();
    
    // サイズ調整
    newCompeito.scale.setScalar(1);
    
    // 開始位置（ビンの上）
    newCompeito.position.set(x, config.jarHeight / 2 + 1, z);
    newCompeito.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    
    sceneRef.current.add(newCompeito);
    compeitosRef.current.push(newCompeito);

    // 落下アニメーション
    const startY = newCompeito.position.y;
    const targetLayer = Math.floor(currentCount / 8);
    const targetY = -config.jarHeight / 2 + 0.2 + targetLayer * 0.25;
    const fallDuration = 1000;
    const startTime = Date.now();

    const animateFall = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fallDuration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      newCompeito.position.y = startY - (startY - targetY) * easeProgress;
      newCompeito.rotation.x += 0.1;
      newCompeito.rotation.z += 0.05;

      if (progress < 1) {
        requestAnimationFrame(animateFall);
      } else {
        console.log('✅ Custom Compeito landed!');
        setCurrentCount(prev => prev + 1);
        setIsAnimating(false);
        if (onCompeitoAdd) {
          onCompeitoAdd(currentCount + 1);
        }
      }
    };

    animateFall();
  }, [config, currentCount, isAnimating, onCompeitoAdd, compeitoModel]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => interactive,
    onPanResponderGrant: (evt) => {
      if (!interactive || currentCount >= config.maxCompeitos) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      const centerX = 150;
      const centerY = 150;
      
      const normalizedX = (locationX - centerX) / 75;
      const normalizedZ = (locationY - centerY) / 75;
      
      const distance = Math.sqrt(normalizedX * normalizedX + normalizedZ * normalizedZ);
      
      if (distance <= 1.0) {
        addCompeitoAtPosition(normalizedX * config.jarRadius * 0.8, normalizedZ * config.jarRadius * 0.8);
      }
    },
  });

  const onContextCreate = useCallback(async (gl: any) => {
    try {
      console.log('🎮 Initializing GLB Compeito Jar scene...');
      
      // 1. レンダラーセットアップ
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000000, 0);
      rendererRef.current = renderer;

      // 2. シーン作成
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // 3. カメラセットアップ
      const camera = new THREE.PerspectiveCamera(
        50,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        100
      );
      camera.position.set(0, 2, 4);
      camera.lookAt(0, 0, 0);

      // 4. ライティング
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 5, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // 5. ビンの作成
      const jarGeometry = new THREE.CylinderGeometry(
        config.jarRadius, 
        config.jarRadius * 0.8, 
        config.jarHeight, 
        16
      );
      const jarMaterial = new THREE.MeshPhongMaterial({
        color: config.jarColor,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      const jar = new THREE.Mesh(jarGeometry, jarMaterial);
      scene.add(jar);

      // 6. こんぺいとう生成
      compeitosRef.current = [];
      
      if (currentCount > 0) {
        const positions = generateCompeitoPositions(currentCount);
        
        for (let i = 0; i < currentCount; i++) {
          // カスタムこんぺいとうモデル使用
          const compeitoObject = compeitoModel.clone();
          compeitoObject.scale.setScalar(1);
          console.log(`✅ Using custom compeito model for compeito ${i + 1}`);
          
          const pos = positions[i];
          compeitoObject.position.set(pos.x, pos.y, pos.z);
          compeitoObject.rotation.set(pos.rotation.x, pos.rotation.y, pos.rotation.z);
          
          scene.add(compeitoObject);
          compeitosRef.current.push(compeitoObject);
        }
      }

      console.log(`✅ GLB Compeito Jar initialized with ${currentCount} compeitos`);

      // 7. レンダーループ
      const animate = () => {
        if (rendererRef.current && sceneRef.current) {
          // ビンを少し回転
          if (jar) {
            jar.rotation.y += 0.01;
          }
          
          // こんぺいとうを少し回転
          compeitosRef.current.forEach((compeito, index) => {
            compeito.rotation.y += 0.02 + index * 0.001;
          });
          
          rendererRef.current.render(scene, camera);
          gl.endFrameEXP();
        }
        animationRef.current = requestAnimationFrame(animate);
      };

      animate();

    } catch (error) {
      console.error('❌ GLB Compeito Jar initialization error:', error);
    }
  }, [config, currentCount, generateCompeitoPositions, compeitoModel]);

  // モバイル環境での表示切り替え
  if (Platform.OS !== 'web' && Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <View style={styles.fallbackJar}>
          <Text style={styles.fallbackJarText}>🍯</Text>
          {showCount && <Text style={styles.countText}>{currentCount}個</Text>}
        </View>
        <Text style={styles.fallbackLabel}>カスタムこんぺいとう貯金</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} {...(interactive ? panResponder.panHandlers : {})}>
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
      
      {showCount && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>{currentCount}個</Text>
        </View>
      )}
      
      {interactive && (
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>タップしてこんぺいとうを追加</Text>
          <Text style={styles.limitText}>{currentCount}/{config.maxCompeitos}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 300,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: colors.background,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  glView: {
    flex: 1,
    borderRadius: 15,
  },
  countContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.primary,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 3,
  },
  countText: {
    color: 'white',
    ...typography.body,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  instructionText: {
    color: 'white',
    textAlign: 'center',
    ...typography.caption,
  },
  limitText: {
    color: colors.text.light,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  fallbackContainer: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.accent,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fallbackJar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.secondary,
  },
  fallbackJarText: {
    fontSize: 80,
    textAlign: 'center',
  },
  fallbackLabel: {
    marginTop: 15,
    color: colors.primary,
    textAlign: 'center',
    ...typography.body,
  },
});