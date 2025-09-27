# cannon-es 詳細調査レポート

## 基本情報

### 概要
- **ライブラリ名**: cannon-es
- **種類**: JavaScript 3D物理エンジン
- **特徴**: cannon.js の maintained fork、TypeScript対応、tree shaking対応

### 開発・保守状況
- **メンテナ**: pmndrs (Poimandres) チーム
- **原作者**: Stefan Hedman (@schteppe)
- **状態**: アクティブに開発・保守中
- **ライセンス**: MIT

## コスト分析

### バンドルサイズ・パフォーマンス
**✅ メリット:**
- Tree shaking 対応で使用しない機能は除外可能
- ESM + CJS の両方対応
- TypeScript ネイティブサポート
- Web Workers対応でメインスレッドをブロックしない

**⚠️ 懸念点:**
- 物理エンジンとしては中〜大サイズのライブラリ
- 複雑な計算処理によるCPU使用量
- メモリ使用量（多数のオブジェクト処理時）

### 開発コスト
**✅ メリット:**
- 豊富なドキュメンテーション
- 多数の実装例とデモ
- React Three Fiber との良好な統合
- 活発なコミュニティサポート

**❌ デメリット:**
- 学習コストが高い（物理エンジンの概念理解が必要）
- デバッグの複雑さ

## 効果・機能

### 物理シミュレーション機能
**✅ 提供機能:**
- 重力、摩擦、反発
- 衝突検出・応答
- 剛体・柔軟体シミュレーション
- 制約システム（ジョイント、スプリング）
- レイキャスティング
- 車両物理
- Ragdoll 物理

### パフォーマンス最適化
- SAP (Sweep and Prune) ブロードフェーズ
- オブジェクトスリープ機能
- インスタンス化対応
- ワーカースレッド実行

## Expo環境での懸念点

### 1. Web Workers制限 ⚠️
**問題:**
- `@react-three/cannon` は Web Workers を使用
- Expo環境（特にモバイル）では Web Workers の制約

**影響:**
- React Native環境でのパフォーマンス問題
- 一部機能が使用不可の可能性

### 2. expo-gl との互換性 ⚠️
**問題:**
- expo-gl は WebGL 1.0 ベース
- cannon-es は標準的なWebGL環境を想定

**潜在的な課題:**
- レンダリングパイプラインの不一致
- メモリ管理の競合
- フレームレート同期問題

### 3. モバイル性能制限 ❌
**制限事項:**
- モバイルデバイスのCPU性能制限
- バッテリー使用量の増加
- 発熱問題

### 4. バンドルサイズ影響 ⚠️
**懸念:**
- アプリサイズの増加
- 初期ロード時間の増加
- ネットワーク使用量

## 実装パターン分析

### 1. フルcannon-es実装
```javascript
// 利点：完全な物理シミュレーション
// 欠点：大きなオーバーヘッド、複雑性
import * as CANNON from 'cannon-es'
```

### 2. use-cannon (React Three Cannon)
```javascript
// 利点：React統合、宣言的API
// 欠点：Web Workers依存、Expo制約
import { Physics, useBox } from '@react-three/cannon'
```

### 3. Direct Integration (最小実装)
```javascript
// 利点：必要な機能のみ、軽量
// 欠点：手動実装の複雑さ
// 重力・衝突のみの実装
```

## 推奨実装戦略

### ❌ 非推奨: フルcannon-es
**理由:**
- Expo環境での制約が多い
- オーバーエンジニアリングのリスク
- コンペイトウ+ボトルのシンプルなケースには過剰

### ⚠️ 条件付き推奨: cannon-esライトアプローチ
**条件:**
- Web Workers機能を使用しない
- 必要最小限の機能のみ使用
- 十分なテスト実行

### ✅ 推奨: シンプル物理実装
**理由:**
- Expo環境での確実な動作
- 軽量で高速
- デバッグ容易
- 要件に最適化

## 結論

### コンペイトウ瓶詰め実装における判定

**cannon-es使用: ❌ 非推奨**

**理由:**
1. **制約リスク**: Expo/React Native環境での動作不確実性
2. **過剰仕様**: シンプルな落下+衝突には大きすぎる
3. **複雑性**: デバッグとメンテナンスが困難
4. **性能懸念**: モバイルでのバッテリー・CPU負荷

**代替案推奨:**
- **カスタム軽量物理**: 重力・バウンス・衝突検出のみ
- **Three.js標準機能**: Raycasting + 境界チェック
- **段階的実装**: 基本機能→必要に応じて拡張

### 次のステップ
1. シンプル物理実装の詳細設計
2. expo-gl環境でのテスト実装
3. パフォーマンス測定とボトルネック特定

## 参考資料
- cannon-es GitHub: https://github.com/pmndrs/cannon-es
- use-cannon: https://github.com/pmndrs/use-cannon
- 公式ドキュメンテーション: https://pmndrs.github.io/cannon-es/docs/
- 実装例: https://pmndrs.github.io/cannon-es/