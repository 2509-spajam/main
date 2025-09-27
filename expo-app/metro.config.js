const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// 3Dアセットサポートを追加
config.resolver.assetExts.push(
  // 3Dモデルファイル
  'obj',
  'mtl',
  'gltf',
  'glb',
  'dae',
  // その他のアセット
  'db',
  'mp3',
  'ttf'
);

module.exports = config;