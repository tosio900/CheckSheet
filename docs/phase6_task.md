# Phase 6 タスクリスト

- `[ ]` 未完了
- `[/]` 進行中
- `[x]` 完了

## 1. 自動完了画面遷移
- `[x]` `ChatCheck.jsx` の `handleAnswer` を修正し、最後の要素回答直後に即座に `onComplete(session)` を呼び出すよう変更

## 2. 「はい・いいえ」回答ボタンの位置固定
- `[x]` `ChatCheck.jsx` の構造を変更し、`AnswerControls` をスクロール要素から分離
- `[x]` `ChatCheck.module.css` のレイアウトを調整

## 3. 複数ページPDFの途切れ問題解消
- `[x]` `PDFTemplate.jsx` をページごとに `<div className="pdf-page">` で分割するよう修正
- `[x]` `pdfGenerator.js` を複数ページ描画方式に修正

## 4. 過去の履歴閲覧対応
- `[x]` `storage.js` に履歴保存・読込処理を追加
- `[x]` `App.jsx`、`useCheckSession.js` にルーティング・状態追加
- `[x]` `HistoryScreen.jsx` 新設と `HomeScreen.jsx` からの導線追加
- `[x]` `ResultScreen.jsx` を ReadOnly (閲覧専用) モードに対応
