# 問い合わせ先削除計画

ホーム画面に表示されている「アプリに関するお問い合わせ先」セクションおよび関連するスタイルを削除します。

## ユーザーレビューが必要な項目
- 特になし。

## 提案される手順

### 1. HomeScreen.jsx の修正
- [MODIFY] [HomeScreen.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/HomeScreen.jsx)
  - `home-contact` クラスを持つ `div` セクション全体（114行目〜131行目付近）を削除します。

### 2. HomeScreen.module.css の修正
- [MODIFY] [HomeScreen.module.css](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/HomeScreen.module.css)
  - 問い合わせセクションに関連する以下のスタイル定義を削除します：
    - `.home-contact`
    - `.home-contact h4`
    - `.contact-info`
    - `.contact-item`
    - `.contact-label`

### 3. 検証
- 修正後に `npm run lint` を実行し、参照エラーなどが発生していないか確認します。
- `npm run build` を実行し、ビルドが成功することを確認します。

## オープンな質問
- 特になし。

## 検証プラン

### 自動テスト
- `npm run lint` の正常終了を確認
- `npm run build` の正常終了を確認

### 手動確認
- ブラウザツールを使用して、ホーム画面から問い合わせ先セクションが消えていることを確認します。
