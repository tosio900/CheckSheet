# 実装計画 - ナビゲーション・バリデーション・PDF出力の改善

この計画では、ユーザーからのフィードバックに基づき、以下の3点を改善します。
1.  **ナビゲーション**: 初回完了時は自動で結果画面へ、修正時は手動ボタンでのみ結果画面へ遷移するように変更。
2.  **バリデーション**: 入力が不完全な場合に「はい」ボタンをグレーアウトし、理由を表示。
3.  **PDF出力**: PDFの不自然な余白を修正。

## ユーザーレビューが必要な事項

> [!IMPORTANT]
> ナビゲーションの挙動変更により、結果画面から戻って修正した後は、最後の質問を答えても自動で結果画面には戻らなくなります。画面右下の「結果画面に戻る」ボタンを押す必要があります。

## 変更内容

---

### 1. ナビゲーションフローの改善

#### [MODIFY] [App.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/App.jsx)
- `isEditingAfterComplete` という状態を追加し、結果画面から編集に戻った際に `true` に設定します。
- `ChatCheck` コンポーネントにこのフラグを渡します。
- 新規開始時やトップに戻る際は `false` にリセットします。

#### [MODIFY] [ChatCheck.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/ChatCheck.jsx)
- `isEditingAfterComplete` プロパティを受け取ります。
- `useEffect` 内の自動遷移ロジックに `!isEditingAfterComplete` の条件を追加し、編集モード中は自動遷移しないようにします。

---

### 2. バリデーションUIの改善

#### [MODIFY] [AnswerControls.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/check/AnswerControls.jsx)
- 入力が不完全な際のメッセージが常に見えるよう、色味や配置を調整。

#### [MODIFY] [ChatCheck.module.css](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/ChatCheck.module.css)
- `.answer-btn.disabled` というクラス指定を `.answer-btn:disabled` に変更し、ネイティブの `disabled` 属性で正しくグレーアウト（grayscale）と不透明度（opacity）が適用されるようにします。

---

### 3. PDF出力ロジックの見直し

#### [MODIFY] [PDFTemplate.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/check/PDFTemplate.jsx)
- `.pdf-page` の `minHeight` プロパティを削除または調整します。余白が不自然なのは、内容が少ない場合でも A4 サイズいっぱいの高さを確保しようとして、下部に大きな空白ができるためと考えられます。
- ページ分割の重み付け（`Weights`）を微調整し、より詰まったレイアウトにします。

#### [MODIFY] [pdfGenerator.js](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/utils/pdfGenerator.js)
- `html2canvas` のキャプチャ時、要素の実際の高さに合わせてキャプチャされるよう設定を確認します。

## 修正の確認方法

### 自動テスト
- なし

### 手動確認
1.  **ナビゲーション**: 
    - 最初の回答完了時に自動遷移することを確認。
    - 結果画面の「修正」ボタンで戻った後、回答を変更しても自動遷移せず、「結果画面に戻る」ボタンで遷移できることを確認。
2.  **バリデーション**:
    - 点名入力が必要な質問で、入力するまで「はい」ボタンがグレーで押せないこと、メッセージが表示されることを確認。
3.  **PDF出力**:
    - PDFを出力し、各ページの下部や項目間に不自然な余白がないか確認。
