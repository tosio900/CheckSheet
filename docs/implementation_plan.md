# 小画面端末の最適化および写真ソース選択の拡張計画

iPhone SE などの小画面デバイスでの操作性を向上させ、かつ写真の取得元を「撮影」と「ライブラリ」から自由に選べるように修正します。

## ⚠️ ユーザーレビューが必要
- **OS標準メニューの採用**: `input` タグの `capture` 属性を削除することで、iOS/Android 標準の選択メニューが表示されるようになります。これにより、アプリ独自のボタンを増やすことなく、ユーザーにとって馴染みのある操作を提供します。

## 提案される変更点

### 1. 写真選択機能の拡張

#### [MODIFY] [ImageAttachment.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/check/ImageAttachment.jsx)
- `input[type="file"]` から `capture="environment"` 属性を削除。
- これにより、タップ時に OS 標準のメニュー（カメラ/写真ライブラリ/ファイル）が表示されるようになります。

### 2. 小画面端末向け注釈エディタの最適化

#### [MODIFY] [ImageAnnotator.module.css](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/check/ImageAnnotator.module.css)
- 画面高が低いデバイス向けのレスポンシブスタイルを追加。
    - `@media (max-height: 600px)` において、ヘッダーと下部ツールバーのパディングを縮小。
    - ボタン内の文字を非表示にし、アイコンのみにする等で垂直方向のスペースを確保。
- `annotator-overlay` のレイアウト構造を再確認し、内容が画面内に必ず収まる（スクロール不要で全エリアが見える）ように調整。

#### [MODIFY] [ImageAnnotator.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/check/ImageAnnotator.jsx)
- キャンバスのサイズ計算時、コンテナのリサイズをより厳密に追従するように修正。

## 検証プラン

### 手動検証
- **iPhone SE (Small Screen) シミュレーション**:
    - ブラウザのデバッグツールで 320x568 や 375x667 のサイズに変更し、注釈エディタの全ボタンが正しく表示され、操作できることを確認。
- **写真ソース選択**:
    - モバイル端末（実機またはシミュレータ）で「追加」ボタンを押し、OS 標準の選択メニューが出ることを確認。
    - 「写真を撮る」と「写真ライブラリ」の両方で画像が正常に取得・注釈できることを確認。
