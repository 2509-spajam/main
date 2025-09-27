import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import { colors } from '../styles/colors';

interface SimpleGLTestProps {
  style?: any;
}

export default function SimpleGLTest({ style }: SimpleGLTestProps) {
  const onContextCreate = (gl: any) => {
    console.log('✅ GLContext created successfully');
    console.log('- drawingBufferWidth:', gl.drawingBufferWidth);
    console.log('- drawingBufferHeight:', gl.drawingBufferHeight);
    
    try {
      // 基本的なWebGL操作のテスト
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(1, 0.84, 0, 1); // 金色背景
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      console.log('✅ Basic GL operations completed');
      gl.endFrameEXP();
      console.log('✅ Frame ended successfully');
      
    } catch (error) {
      console.error('❌ SimpleGLTest error:', error);
    }
  };

  // Webプラットフォームの場合はフォールバック
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>Web Preview</Text>
        <Text style={styles.fallbackSubText}>3D requires mobile device</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
      <Text style={styles.label}>GL Test</Text>
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