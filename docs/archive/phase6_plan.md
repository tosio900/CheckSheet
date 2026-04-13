# 運用改善フェーズ（Phase 6） 実装計画書

ユーザーからのフィードバックに基づき、業務をよりサクサク進めるためのUI/UX改善、および実用での制約（PDF描画）を克服する追加リファクタリングを計画します。

## 対象となる課題
1. **過去履歴へのアクセス欠如**: 現場の人が過去の出力結果を振り返ることができない。
2. **iPad等でのPDF途切れ**: `html2canvas` で1枚の巨大なCanvasを生成する方式は、ブラウザの描画限界（特にSafari）にぶつかると下部が白紙・途切れる。
3. **回答ボタンの浮遊**: 「はい」「いいえ」ボタンが質問カード内に同居しているため、設問の長さによってボタン位置が動き、連続タップ（サクサク操作）を阻害している。
4. **完了のワンテンポ遅れ**: 最後の質問に答えてチェックを終えた際、わざわざ「完了」ボタンを押さなくてはならず、手間である。

---

## 提案される変更箇所

### 1. 「過去の履歴閲覧対応」 (History Management)
アプリ内に「履歴画面（History Screen）」を新設し、過去に完了した数件のセッションデータをローカルストレージ・またはIndexedDBに保存して呼び出せるようにします。

#### [MODIFY] `src/utils/storage.js`
- `saveToHistory(session)`: チェック完了時に呼び出し、`"chksess_history"` (LocalStorage配列) に保存する関数を追加（最新50件まで等に制限）。
- `loadHistory()`: 保存された履歴配列を返す関数を追加。

#### [MODIFY] `src/App.jsx`
- ルーティングに `SCREENS.HISTORY` を追加。
- `HomeScreen` 等から履歴画面に遷移する導線を実装。

#### [NEW] `src/components/HistoryScreen.jsx`
- 過去の完了済みセッションを一覧表示（日付や現場名をリストアップ）。
- タップすると該当のセッションデータを使って `ResultScreen.jsx` を「閲覧（ReadOnly）モード」で開く導線、もしくは直接PDFを生成する導線を実装。

---

### 2. 「複数ページPDFの途切れ問題」の根本的解消
WebKitの高さ制限（4096px超え）を回避するため、単一の巨大DOMを `html2canvas` に渡すのを見直し、「A4ページサイズごとの `div` のリスト」として描画するように `PDFTemplate.jsx` を再設計します。

#### [MODIFY] `src/components/check/PDFTemplate.jsx`
- 項目のリストをチャンク化（例: 13〜15項目ごとにグループ分け）。
- 各グループを `<div className="pdf-page" style={{ height: "1122px", width: "794px" }}>` 等で物理的にページ分割して囲む。
- 最初のページにはヘッダー情報、最後のページにはフッターを含める。

#### [MODIFY] `src/utils/pdfGenerator.js`
- `.pdf-container` を一丸とするのではなく、内包する複数の(`.pdf-page`) ノード群を取得。
- for-of ループでページごとに `html2canvas` を呼び出し、それぞれ `pdf.addImage()` + `pdf.addPage()` を行っていくため、iOSのCanvas制限を完全に回避できます。

---

### 3. 「はい・いいえ」回答ボタンの位置固定
フレックスボックスの構造を見直し、ボタン類をスクロールするコンテナ領域の外周（固定されたボトムエリア）に出すことで、本文の長さに影響されず常に同じ定位置（画面最下部など）にとどまるように修正します。

#### [MODIFY] `src/components/ChatCheck.jsx`
- 構造の変更：
  ```jsx
  <div className="check-screen">
      <Header />
      <ProgressBar />
      {/* 以下のスクロールする領域内に入っていた AnswerControls を外に移動 */}
      <div className="check-content fixed-layout overflow-auto">
          <QuestionCard />
      </div>
      {/* Containerの外側に置くことで、スクロールに関係なく常に最下部に固定される */}
      <AnswerControls />
  </div>
  ```

#### [MODIFY] `src/components/ChatCheck.module.css`
- パディングなどのレイアウト微調整を加え、スクロール要素と固定要素が被らないようにします。

---

### 4. 最終問題クリア直後の「自動完了画面遷移」
ユーザーが最後の質問（あるいは未回答の最後の1件）に答えて進捗が完了状態になった瞬間、自動的に「結果画面」へ遷移するようにしてタップ数を減らします。

#### [MODIFY] `src/components/ChatCheck.jsx`
- `handleAnswer` 等の中で、入力保存後に「全質問が回答済みステータス」になったかを判定するロジックを挟む。
- スムーズに完了したことを認知させるため、0.5秒〜0.8秒程度の短いアニメーション（チェックマークなど）ののち、自動的に `onComplete(session)` を発火させる。

---

## ユーザーへの確認事項（Open Questions）

> [!IMPORTANT]
> 1. **履歴画面について**: 過去の履歴を一覧から選んだ後、直接「PDFダウンロード」をさせますか？それとも「結果確認画面（今と同じResultScreen）」を閲覧専用で開かせて、そこからPDFを出力するようにしますか？
> 2. **完全自動遷移について**: 最後の質問に答えた瞬間に自動的にチェックが完了し画面が切り替わると、「後から見返す前に飛んでしまった」と驚くユーザーがいらっしゃる可能性があります。0.5秒〜1秒程度の短いディレイを持たせて自動遷移させる想定でよろしいでしょうか。
