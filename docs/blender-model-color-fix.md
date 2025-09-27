# BlenderでGLBモデルの色修正手順書

## 目的
conpeito.glbモデルの基色を灰色から白色/明色に変更し、アプリ側でのパステルカラー適用時にくすまないようにする

## 事前準備

### 必要ソフトウェア
- **Blender 3.6以降** (推奨: 最新LTS版)
- GLB/GLTF形式をサポートするバージョン

### 現在のファイル位置
- 元ファイル: `expo-app/assets/objs/conpeito.glb`
- バックアップ推奨: `conpeito_backup.glb`

## 手順

### Step 1: Blenderでモデルを開く

1. **Blenderを起動**
2. **File > Import > glTF 2.0 (.glb/.gltf)** をクリック
3. `expo-app/assets/objs/conpeito.glb` を選択して **Import glTF 2.0**
4. モデルがビューポートに読み込まれることを確認

### Step 2: モデルの現在色を確認

1. **3D Viewport** で `Tab` キーを押して **Edit Mode** に入る
2. `A` キーで全選択
3. **Properties Panel** (右側) の **Material Properties** タブ (🔴アイコン) をクリック
4. **Base Color** の現在値を確認
   - 灰色系 (例: 0.5, 0.5, 0.5) の場合は修正が必要

### Step 3: マテリアルの色修正

#### 方法A: 白色ベース (推奨)
1. **Material Properties** タブで **Base Color** をクリック
2. カラーピッカーで以下の値に設定:
   - **RGB: (1.0, 1.0, 1.0)** または **HEX: #FFFFFF**
   - **HSV: Brightness = 1.0**

#### 方法B: 明るいオフホワイト (より自然)
1. **Base Color** を以下に設定:
   - **RGB: (0.95, 0.95, 0.95)** または **HEX: #F2F2F2**
   - わずかにグレーを残して自然な影を保持

### Step 4: マテリアル設定の最適化

1. **Metallic** を **0.0** に設定（プラスチック/セラミック感）
2. **Roughness** を **0.3-0.5** に設定（適度な光沢）
3. **Specular** を **0.5** に設定（反射調整）
4. **Alpha** を **1.0** に設定（完全不透明）

### Step 5: プレビューで確認

1. **Shading Workspace** に切り替え（上部タブ）
2. **Viewport Shading** を **Material Preview** に設定（右上の球アイコン）
3. モデルが白っぽく表示されることを確認
4. ライティング環境で色味をチェック

### Step 6: エクスポート設定

1. **File > Export > glTF 2.0 (.glb/.gltf)** をクリック
2. エクスポート設定:
   - **Format**: glTF Binary (.glb)
   - **Include**: Selected Objects (モデルを選択している場合)
   - **Transform**: Apply Modifiers = ON
   - **Geometry**: 
     - UVs = ON
     - Normals = ON
     - Colors = ON (**重要**)
   - **Materials**: Export Materials = ON
   - **Animation**: なし (静的モデルのため)

### Step 7: ファイル保存

1. **ファイル名**: `conpeito_white.glb` (テスト用)
2. **保存場所**: `expo-app/assets/objs/`
3. **Export glTF 2.0** をクリックして実行

### Step 8: アプリでのテスト

1. GLBファイル名を一時的に変更:
   ```typescript
   // GLBCompeitoJar.tsxで
   const glbAsset = require('../assets/objs/conpeito_white.glb');
   ```

2. アプリを起動してパステルカラーの鮮やかさを確認

3. 満足できる結果なら:
   - `conpeito.glb` → `conpeito_gray_backup.glb` にリネーム
   - `conpeito_white.glb` → `conpeito.glb` にリネーム

## 品質確認チェックリスト

### ✅ 色確認項目
- [ ] Base Color が白系 (RGB値が0.9以上)
- [ ] Material Preview で白っぽく表示される
- [ ] 影の部分でも極端に暗くない
- [ ] メタリック感がない（Metallic = 0.0）

### ✅ 形状確認項目
- [ ] モデルの形状が変化していない
- [ ] 突起部分が正常
- [ ] スケールが適切
- [ ] UVマッピングが崩れていない

### ✅ エクスポート確認項目
- [ ] ファイルサイズが適切（極端に大きくない）
- [ ] GLBファイルがアプリで読み込める
- [ ] マテリアル情報が保持されている

## トラブルシューティング

### 問題1: マテリアルが見つからない
**症状**: Material Properties に何も表示されない  
**解決**: オブジェクトを選択してから Material Properties を確認

### 問題2: 色が反映されない
**症状**: 白に変更しても灰色のまま  
**解決**: 
- Shading Workspace でノードエディターを確認
- Principled BSDF の Base Color が正しく設定されているか確認

### 問題3: エクスポート後にアプリで読み込めない
**症状**: GLBファイルが404エラー  
**解決**:
- ファイル名の大文字小文字を確認
- ファイルパスが正しいか確認
- Metro bundlerを再起動

### 問題4: 形状が変わってしまった
**症状**: モデルの形が変形  
**解決**:
- インポート時に Transform 設定を確認
- Scale, Rotation が適切か確認

## 期待される結果

### Before (現在)
- 基色: 灰色系 → パステル色が暗くくすむ
- 発色: 悪い

### After (修正後)  
- 基色: 白色系 → パステル色が鮮やか
- 発色: 良好 ✨

### アプリでの色差
```
修正前: パステルピンク × 灰色 = くすんだピンク
修正後: パステルピンク × 白色 = 鮮やかなピンク 🌸
```

## 次のステップ

1. **即座実行**: この手順書に従ってBlenderで色修正
2. **テスト**: アプリで色の鮮やかさを確認
3. **最適化**: 必要に応じてRoughness等を微調整
4. **デプロイ**: 満足できる結果なら本ファイルを置き換え

## 所要時間

- **Blender習熟者**: 10-15分
- **初心者**: 30-45分（Blenderインストール含む）

## 注意事項

⚠️ **必ずバックアップを取る**: 元のファイルを保護  
⚠️ **段階的テスト**: 一度に全て変更せず、色のみ修正してテスト  
⚠️ **ファイルサイズ**: エクスポート設定でファイルサイズが膨らまないよう注意