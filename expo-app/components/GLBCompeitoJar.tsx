import React, { useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, Platform, StyleSheet, PanResponder } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Asset } from 'expo-asset';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
// グローバルのTHREEオブジェクトを設定（Metro bundler要求）
(global as any).THREE = (global as any).THREE || THREE;

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
  compeitoSize = 0.03, // さらに小さく調整
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
  const glbModelRef = useRef<THREE.Group | null>(null);
  
  const [currentCount, setCurrentCount] = useState(count);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGLBLoaded, setIsGLBLoaded] = useState(false);
  
  const config = useMemo(() => ({
    jarRadius: jarRadius * 0.9,
    jarHeight: jarHeight * 0.9,
    compeitoSize: compeitoSize,
    jarColor: jarColor,
    maxCompeitos: maxCompeitos
  }), [jarRadius, jarHeight, compeitoSize, jarColor, maxCompeitos]);

  const animationRef = useRef<number | null>(null);

  // GLBモデルを読み込む関数
  const loadGLBModel = useCallback(async (): Promise<THREE.Group | null> => {
    try {
      console.log('🔄 Loading GLB model...');
      
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const glbAsset = require('../assets/objs/conpeito.glb');
      
      // Asset.loadAsync()を使用してローカルURIを取得
      const [asset] = await Asset.loadAsync(glbAsset);
      if (!asset.localUri) {
        throw new Error('Failed to get local URI from asset');
      }
      
      console.log('📂 Asset loaded, local URI:', asset.localUri);
      
      // GLTFLoaderでローカルURIから読み込み
      return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(
          asset.localUri!,
          (gltf: any) => {
            console.log('✅ GLB model loaded successfully');
            setIsGLBLoaded(true);
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

  const generateCompeitoPositions = useCallback((count: number) => {
    const positions = [];
    const baseRadius = config.jarRadius * 0.7; // 少し内側に配置
    
    for (let i = 0; i < count; i++) {
      const layer = Math.floor(i / 10); // レイヤーあたりのこんぺいとう数を増やす
      const positionInLayer = i % 10;
      const angleStep = (Math.PI * 2) / 10;
      const angle = positionInLayer * angleStep + layer * 0.3;
      const radius = baseRadius * (0.5 + Math.random() * 0.4); // より内側に配置
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -config.jarHeight / 2 + 0.15 + layer * 0.2 + Math.random() * 0.08; // より密に配置
      
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
    if (!sceneRef.current || isAnimating || !glbModelRef.current) return;
    
    console.log(`🍬 Adding GLB compeito at (${x.toFixed(2)}, ${z.toFixed(2)})`);
    setIsAnimating(true);

    // GLBモデルから新しいこんぺいとう作成
    const newCompeito = glbModelRef.current.clone();
    
    // サイズ調整（より小さく）
    newCompeito.scale.setScalar(0.2);
    
    // 開始位置（ビンの上）
    newCompeito.position.set(x, config.jarHeight / 2 + 1, z);
    newCompeito.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    
    sceneRef.current.add(newCompeito);
    compeitosRef.current.push(newCompeito);

    // 落下アニメーション
    const startY = newCompeito.position.y;
    const targetLayer = Math.floor(currentCount / 10); // 新しいレイヤーロジックに合わせる
    const targetY = -config.jarHeight / 2 + 0.15 + targetLayer * 0.2; // 新しい配置に合わせる
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
        console.log('✅ GLB Compeito landed!');
        setCurrentCount(prev => prev + 1);
        setIsAnimating(false);
        if (onCompeitoAdd) {
          onCompeitoAdd(currentCount + 1);
        }
      }
    };

    animateFall();
  }, [config, currentCount, isAnimating, onCompeitoAdd]);

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

      // 3. カメラセットアップ（より美しいアングル）
      const camera = new THREE.PerspectiveCamera(
        45, // 少し狭いFOVで遠近感を出す
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        100
      );
      camera.position.set(2, 3, 5); // より高い位置から見下ろす角度
      camera.lookAt(0, 0, 0);

      // 4. 改良されたライティング
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // 環境光を少し抑える
      scene.add(ambientLight);
      
      // メインの方向光（上からの光）
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 8, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);
      
      // サイドからの補助光（立体感を出す）
      const sideLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
      sideLight.position.set(-3, 2, 4);
      scene.add(sideLight);
      
      // リムライト（輪郭を強調）
      const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
      rimLight.position.set(-5, -3, -5);
      scene.add(rimLight);

      // 5. 改良されたビンの作成
      const jarGeometry = new THREE.CylinderGeometry(
        config.jarRadius, 
        config.jarRadius * 0.8, 
        config.jarHeight, 
        24 // より滑らかな円柱
      );
      const jarMaterial = new THREE.MeshPhongMaterial({
        color: config.jarColor,
        transparent: true,
        opacity: 0.25, // より透明で中身が見えやすく
        side: THREE.DoubleSide,
        shininess: 100, // ガラスのような光沢
        reflectivity: 0.1
      });
      const jar = new THREE.Mesh(jarGeometry, jarMaterial);
      scene.add(jar);

      // 6. GLBモデル読み込み
      const glbModel = await loadGLBModel();
      if (glbModel) {
        glbModelRef.current = glbModel;
        console.log('✅ GLB model ready for use');
        
        // 既存のこんぺいとうを配置
        compeitosRef.current = [];
        
        if (currentCount > 0) {
          const positions = generateCompeitoPositions(currentCount);
          
          for (let i = 0; i < currentCount; i++) {
            const compeitoObject = glbModel.clone();
            compeitoObject.scale.setScalar(0.2); // より小さく調整
            console.log(`✅ Using GLB model for compeito ${i + 1}`);
            
            const pos = positions[i];
            compeitoObject.position.set(pos.x, pos.y, pos.z);
            compeitoObject.rotation.set(pos.rotation.x, pos.rotation.y, pos.rotation.z);
            
            scene.add(compeitoObject);
            compeitosRef.current.push(compeitoObject);
          }
        }
      } else {
        console.log('❌ GLB model failed to load, using fallback');
      }

      console.log(`✅ GLB Compeito Jar initialized with ${currentCount} compeitos`);

      // 7. 改良されたレンダーループ
      const animate = () => {
        if (rendererRef.current && sceneRef.current) {
          // ビンをゆっくり回転
          if (jar) {
            jar.rotation.y += 0.005; // よりゆっくり
          }
          
          // こんぺいとうを美しく回転（個別の速度で）
          compeitosRef.current.forEach((compeito, index) => {
            compeito.rotation.y += 0.015 + (index % 3) * 0.005;
            compeito.rotation.x += 0.008 + (index % 2) * 0.003;
            compeito.rotation.z += 0.012 + (index % 4) * 0.002;
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
  }, [config, currentCount, generateCompeitoPositions, loadGLBModel]);

  // モバイル環境での表示切り替え
  if (Platform.OS !== 'web' && Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <View style={styles.fallbackJar}>
          <Text style={styles.fallbackJarText}>🍯</Text>
          {showCount && <Text style={styles.countText}>{currentCount}個</Text>}
        </View>
        <Text style={styles.fallbackLabel}>GLBこんぺいとう貯金</Text>
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
          {!isGLBLoaded && <Text style={styles.loadingText}>GLB読み込み中...</Text>}
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
  loadingText: {
    color: colors.text.light,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
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