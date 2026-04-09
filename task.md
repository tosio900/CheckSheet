# 測量前チェックシステム MVP改善（フェーズ1.5）タスクリスト

## ステータス凡例
- [ ] 未着手
- [/] 進行中
- [x] 完了

---

## 1. 入力負担軽減（自動入力）
- [x] `src/utils/storage.js` の修正（プロフィール保存・読み込み処理の追加）
- [x] `src/components/StartScreen.jsx` の修正（初期値セットと保存処理の組み込み）

## 2. 備考の常時表示・デザイン調整
- [x] `src/components/ChatCheck.jsx` の修正（アコーディオンUIの廃止、常時表示への変更）
- [x] `src/index.css` の修正（備考エリアの新しいスタイリング）

## 3. 回答履歴の表示・Undo機能
- [x] `src/components/ChatCheck.jsx` の修正（上部に直近の回答履歴を表示するUI追加）
- [x] `src/components/ChatCheck.jsx` の修正（履歴タップ時にその質問まで戻るロジックの追加）
- [x] `src/index.css` の修正（履歴リストのスタイリング）

## 4. 触覚フィードバック
- [x] `src/components/ChatCheck.jsx` の修正（ボタン押下時の `navigator.vibrate` 実装）

## 5. 動作検証
- [/] ローカル環境での全体動作テスト
- [ ] ウォークスルードキュメントの更新
