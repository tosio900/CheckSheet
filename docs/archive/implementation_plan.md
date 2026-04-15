# UI/UX改善・品質向上 実装計画書

UI/UXレビューで指摘された「余白」「サイズ感」「整列」「視線の流れ」「操作のしさすさ」の課題を解決し、正規リリース品質まで引き上げるための包括的な実装計画です。

## ユーザーレビュー必須項目

> [!IMPORTANT]
> **主要なデザイン変更点**
> 1. **入力画面の整列変更**: これまで「中央揃え」だった一部のヘッダーを「左揃え」に変更します。これは視線の流れをスムーズにするための意図的な変更ですが、ブランドイメージに影響がないかご確認ください。
> 2. **プログレスバーの太型化**: 視認性を優先し、バーの厚みを 8px から 12px に変更します。

---

## 修正方針とベストプラクティス

1. **一貫性の確保**: 画面を跨いで「揃え」のルール（基本は左揃え）を統一します。
2. **情報の階層化**: 余白（Margin/Padding）に強弱をつけ、情報のグループを明確にします。
3. **操作性の追求**: モバイルでの使用を前提とし、タップしやすいサイズ（最小 44px）と、屋外での視認性を追求します。
4. **1pxの精度**: 要素間のズレや、不要なスクロールバーを徹底的に排除します。

---

## 実施内容

### 1. ホーム画面のブラッシュアップ
ホーム画面の「窮屈さ」と「ボタンのバランス」を改善します。

#### [MODIFY] [HomeScreen.module.css](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/HomeScreen.module.css)
- `.home-actions` の `gap` を `var(--space-4)` (16px) から `var(--space-6)` (24px) へ拡大し、誤タップ防止と安定感を向上。
- ボタン内のアイコンとテキストの整列（垂直中央揃え）を再定義。
- `.home-logo` の下部余白を調整し、画面全体の垂直バランスを整える。

---

### 2. チェック情報入力画面の整列改善
視線をスムーズに誘導するため、中央揃えと左揃えの混在を解消します。

#### [MODIFY] [StartScreen.module.css](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/StartScreen.module.css)
- `.start-header` を `text-align: left` に変更。
- 入力欄（Label/Input）の左端とタイトルの左端を垂直に揃え、迷いのない入力体験を提供。
- 上部 Padding を調整し、入力開始までの距離を最適化。

---

### 3. チェック実行画面（チャット画面）の視認性向上
現場での状況把握を容易にし、視覚的ノイズを排除します。

#### [MODIFY] [ChatCheck.module.css](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/ChatCheck.module.css)
- `.progress-bar-track` の高さを `8px` から `12px` に拡大。
- `.progress-bar-fill` の色をより明度の高いグリーンに変更し、コントラストを強調。
- `.question-card` において、不要なスクロールバーが表示されないよう `overflow: hidden` または可変高さを調整。
- カテゴリ名とカウント表示の垂直方向の揃え（Baseline）を微調整。

---

### 4. 履歴一覧画面のレイアウト崩れ対策
データ量や内容に左右されない堅牢なレイアウトを実現します。

#### [MODIFY] [HistoryScreen.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/HistoryScreen.jsx)
- インラインスタイルを整理し、`siteName`（現場名）と `inspector`（点検者名）が長い場合のテキストの回り込み・省略（Ellipsis）を設定。
- アイコンのサイズと情報の間の余白を `4px` から `8px` へ微増。
- カード内の情報密度を調整し、スキャンしやすく改善。

---

### 5. 結果画面の精緻化
信頼感を醸成するための「精密な整列」を実現します。

#### [MODIFY] [ResultScreen.module.css](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/ResultScreen.module.css)
- サマリーカード内の数字とラベルのセンターラインが 1px 単位で合っているか再配置。
- `.result-item` 内のアイコンとテキストの行間（Leading）のバランスを調整。

---

## 影響範囲と注意点

- **影響範囲**: アプリケーションのすべての画面にわたりますが、ロジック変更はなく `CSS/スタイル` の変更に限定されます。
- **注意点**: 
    - PWAとしてのデスクトップ表示時に、余白が広がりすぎてスカスカに見えないよう、`max-width` 内でのバランスを維持します。
    - iOS の Safari における `safe-area-inset` への配慮を継続します。

---

## 進捗管理・タスクリスト

- [x] デザインシステムの再確認と微調整 (`index.css`) — 変更不要（既存定義を活用）
- [x] ホーム画面の余白とボタンバランスの修正 (`HomeScreen.module.css` / `HomeScreen.jsx`)
  - gap: 16px → 24px 相当に拡大
  - ロゴ下余白: space-6 → space-8 に増加
  - インラインスタイルを CSS Modules に移行
  - max-width: 320px → 340px に拡張
- [x] 入力画面の整列（左揃え）への統一 (`StartScreen.module.css`)
  - タイトルを `text-align: left` に変更
  - 上部 padding を 32px → 24px に最適化
  - iOS safe area 対応を強化
- [x] チャット画面のプログレスバー・質問カードの調整 (`ChatCheck.module.css`)
  - プログレスバー: 8px → 12px に太型化
  - バー色をグラジエント化（明→暗）した視認性向上
  - 質問カードに`overflow: hidden`を追加しスクロールバー排除
  - 回答エリアに区切り線と safe-area 対応を追加
- [x] 履歴・結果画面のレイアウト堅牢化（テキスト溢れ対策）
  - `HistoryScreen.jsx`: CSS Modules に全面移行
  - `HistoryScreen.module.css`: 新規作成（ellipsis・ホバー・空状態UI含む）
  - `ResultScreen.module.css`: サマリーカードのflex整列精密化、アイテムのmin-height追加
- [x] 全画面を実機（またはブラウザエミュレータ）で 1px 単位で再検証
  - ブラウザエミュレータにて全画面をスクリーンショット確認済み

---

## 検証計画

### 自動テスト
- スナッショッテストによる意図しないレイアウト崩れの検知（必要に応じて実施）。

### 手動検証
- **ブラウザ開発ツール**: 各種デバイスサイズ（iPhone SE, Pixel, iPhone 14 Pro Max等）での表示確認。
- **実機検証**: 実際に現場で使用するスマートフォンでの視認性（屋外想定の輝度など）と操作性チェック。
- **データ入力負荷**: 非常に長い現場名や点検者名を入力し、レイアウトが壊れないか確認。
