import React from 'react';
import { Platform } from 'react-native';
import Compeito3D from './Compeito3D';
import CompeitoFallback from './CompeitoFallback';
import SimpleGLTest from './SimpleGLTest';
import Basic3DCube from './Basic3DCube';

interface CompeitoAnimationProps {
  style?: any;
  testMode?: 'gl' | 'cube' | 'compeito' | 'fallback'; // デバッグ用フラグ
}

export default function CompeitoAnimation({ 
  style, 
  testMode = 'compeito' 
}: CompeitoAnimationProps) {
  console.log(`🎮 CompeitoAnimation mode: ${testMode}, platform: ${Platform.OS}`);

  // デバッグモード
  if (testMode === 'fallback') {
    return <CompeitoFallback style={style} />;
  }

  if (testMode === 'gl' && Platform.OS !== 'web') {
    return <SimpleGLTest style={style} />;
  }

  if (testMode === 'cube' && Platform.OS !== 'web') {
    return <Basic3DCube style={style} />;
  }

  // 通常モード: プラットフォーム判定
  const shouldUse3D = Platform.OS !== 'web';

  if (shouldUse3D) {
    return <Compeito3D style={style} />;
  } else {
    return <CompeitoFallback style={style} />;
  }
}