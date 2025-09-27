import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../styles/colors';

interface CompeitoFallbackProps {
  style?: any;
}

export default function CompeitoFallback({ style }: CompeitoFallbackProps) {
  const scaleAnimation = useRef(new Animated.Value(0.8)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;
  const floatAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('🌐 Starting 2D fallback animation...');
    
    // 拡大縮小アニメーション（呼吸効果）
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    // 回転アニメーション
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnimation, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    );

    // 浮遊アニメーション
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    scaleLoop.start();
    rotateLoop.start();
    floatLoop.start();

    return () => {
      scaleLoop.stop();
      rotateLoop.stop();
      floatLoop.stop();
    };
  }, [scaleAnimation, rotateAnimation, floatAnimation]);

  const rotateInterpolate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const floatInterpolate = floatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.compeito,
          {
            transform: [
              { scale: scaleAnimation },
              { rotate: rotateInterpolate },
              { translateY: floatInterpolate },
            ],
          },
        ]}
      >
        {/* 多層の八角形でコンペイトウを表現 */}
        <View style={[styles.layer, styles.layer1]} />
        <View style={[styles.layer, styles.layer2]} />
        <View style={[styles.layer, styles.layer3]} />
        <View style={styles.highlight} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compeito: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  layer: {
    position: 'absolute',
    borderRadius: 20,
  },
  layer1: {
    width: 100,
    height: 100,
    backgroundColor: colors.reward.gold,
    transform: [{ rotate: '0deg' }],
  },
  layer2: {
    width: 85,
    height: 85,
    backgroundColor: '#FFE55C',
    transform: [{ rotate: '45deg' }],
  },
  layer3: {
    width: 70,
    height: 70,
    backgroundColor: '#FFED85',
    transform: [{ rotate: '90deg' }],
  },
  highlight: {
    position: 'absolute',
    width: 30,
    height: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    opacity: 0.7,
    top: 20,
    left: 35,
  },
});