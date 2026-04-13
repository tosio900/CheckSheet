# 📋 CheckSheet 改善計画書

> **作成日**: 2026-04-10  
> **基準文書**: [architecture_review.md](file:///c:/Users/t-matsuki/Desktop/CheckSheet/docs/architecture_review.md)  
> **対象**: 測量前チェックシステム (CheckSheet PWA)

---

## 概要

アーキテクチャレビューで発見された全22件の問題（重大5件 / 改善推奨9件 / 軽微8件）を、
4つのフェーズに分けて段階的に改善する。各フェーズは独立してデプロイ可能であり、
前のフェーズが未完了でも後続フェーズの着手を妨げない設計とする。

### フェーズ概要

| フェーズ | 名称 | 対象問題 | 所要時間 | リスク |
|:---:|---|---|:---:|:---:|
| **Phase 1** | 即時バグ修正・デッドコード除去 | H-1, H-5, L-1~L-8, M-5, M-6 | 1〜2時間 | 極低 |
| **Phase 2** | データ整合性・安定性強化 | H-2, H-3, H-4, M-9 | 2〜3時間 | 低 |
| **Phase 3** | コード品質・可読性改善 | M-2, M-3, M-4, M-8 | 3〜4時間 | 低〜中 |
| **Phase 4** | アーキテクチャ改善 | M-1, M-7 + 追加改善 | 1〜2日 | 中 |

> [!IMPORTANT]
> Phase 1 と Phase 2 は**現場利用に直接影響するバグ修正**を含むため、最優先で着手すること。

---

## Phase 1: 即時バグ修正・デッドコード除去

> **目的**: 現在表示が壊れている箇所・本番環境で動作しない箇所を最優先で修正する  
> **所要時間**: 1〜2時間  
> **リスク**: 極低（単純な値の差し替え・不要コードの削除のみ）

---

### 1-1. H-1: チェック項目数のハードコード修正

**対象ファイル**: [HomeScreen.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/HomeScreen.jsx)

**現状の問題**:
- L34 で `43項目` がハードコードされているが、実データ（`checkItems.js`）は **39項目**
- `TOTAL_ITEMS` 定数が `data/checkItems.js` に存在するのに使用されていない

**修正内容**:
```diff
+ import { TOTAL_ITEMS } from "../data/checkItems";

  // L34
- 進捗: {resumeSession.answers.length}/43項目
+ 進捗: {resumeSession.answers.length}/{TOTAL_ITEMS}項目
```

**ベストプラクティス**:
- マジックナンバーは必ず定数参照に置き換える
- 将来カテゴリが追加された際にこの箇所を修正し忘れるリスクをゼロにする
- **grep で `43` や `39` という数字リテラルが他に残っていないか確認すること**

**影響範囲**: `HomeScreen.jsx` のみ。他のコンポーネントへの影響なし。

**検証方法**: ホーム画面で中断セッションの進捗表示が `X/39項目` となることを確認。

---

### 1-2. H-5: ErrorBoundary のリダイレクトパス修正

**対象ファイル**: [ErrorBoundary.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/common/ErrorBoundary.jsx)

**現状の問題**:
- L25 で `window.location.href = "/"` としているが、GitHub Pages のベースパスは `/CheckSheet/`
- 本番環境でエラー発生 → 「ホームに戻る」クリック → **404 エラー**で完全にリカバリー不能

**修正内容**:
```diff
  handleReset = () => {
    this.setState({ hasError: false, error: null });
-   window.location.href = "/";
+   window.location.href = import.meta.env.BASE_URL || "/";
  };
```

**ベストプラクティス**:
- Vite プロジェクトでは `import.meta.env.BASE_URL` が `vite.config.js` の `base` 設定を自動反映する
- ハードコードされた URL パスはアプリケーション全体で使うべきでない
- `|| "/"` のフォールバックは開発（`dev`）環境でのセーフティネット

**影響範囲**: `ErrorBoundary.jsx` のみ。エラー発生時のリカバリーフローにのみ関与。

**注意点**:
- `import.meta.env.BASE_URL` はクラスコンポーネントの `handleReset` 内で呼んでも問題なく動作する（ビルド時に静的に置換されるため）
- テスト時は開発サーバーとビルド後の `preview` の両方で確認すること

**検証方法**:
1. `npm run build && npm run preview` で本番ビルドを起動
2. 意図的にエラーを発生させ（例: Contextの外で `useCheckSession` を呼ぶ）、「ホームに戻る」ボタンが正しく機能することを確認

---

### 1-3. L-5: `resumeSession.date` の未定義プロパティ修正

**対象ファイル**: [HomeScreen.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/HomeScreen.jsx)

**現状の問題**:
- L36 で `resumeSession.date` を参照しているが、セッションオブジェクトに `date` プロパティは存在しない
- 存在するのは `startedAt`（ISO 8601 形式の文字列）
- 現在「日付: undefined」が表示されている

**修正内容**:
```diff
  // L36
- 日付: {resumeSession.date}
+ 日付: {new Date(resumeSession.startedAt).toLocaleDateString("ja-JP")}
```

**ベストプラクティス**:
- 日付フォーマットは `toLocaleDateString("ja-JP")` でロケールを明示する
- タイムゾーンの問題を避けるため、不要な変換は行わない

**影響範囲**: `HomeScreen.jsx` のみ。

**注意点**: `resumeSession.startedAt` が `null` や不正な値の場合に備えて、以下のような安全策も検討可能：
```jsx
日付: {resumeSession.startedAt 
  ? new Date(resumeSession.startedAt).toLocaleDateString("ja-JP") 
  : "-"}
```

**検証方法**: ホーム画面で中断セッションカードに `2026/04/10` のような日付が正しく表示されることを確認。

---

### 1-4. M-6: `handleHandleAnswer` のリネーム

**対象ファイル**: [ChatCheck.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/ChatCheck.jsx)

**現状の問題**:
- L47 で `handleHandleAnswer` と `handle` が二重になっている
- リファクタリング残骸で可読性が悪い

**修正内容**:
```diff
- const handleHandleAnswer = (answer) => {
+ const handleAnswer = (answer) => {
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    updateAnswer(currentItem, answer, currentInputs);
  };

  // L103 の参照箇所も同時修正
- onAnswer={handleHandleAnswer}
+ onAnswer={handleAnswer}
```

**ベストプラクティス**:
- リネーム時は必ず **参照箇所すべて** を同時に修正する
- IDE の「シンボルのリネーム」機能を活用すると安全

**影響範囲**: `ChatCheck.jsx` 内の定義と参照の2箇所のみ。外部には露出していない。

---

### 1-5. M-5: `storage.js` の重複定数削除

**対象ファイル**: [storage.js](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/utils/storage.js)

**現状の問題**:
- L74 に `const PROFILE_KEY = "survey_user_profile"` が定義されているが、未使用
- 同じ値が `constants/session.js` の `STORAGE_KEYS.USER_PROFILE` に定義済みで、そちらが実際に使用されている

**修正内容**:
```diff
- const PROFILE_KEY = "survey_user_profile";
```

**影響範囲**: なし。未使用定数の削除のみ。

---

### 1-6. L-6: InstallPrompt の未使用 import 削除

**対象ファイル**: [InstallPrompt.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/InstallPrompt.jsx)

**修正内容**:
```diff
- import { useState, useEffect } from "react";
+ import { useState } from "react";
```

**影響範囲**: なし。ツリーシェイキングにより実行時への影響もゼロだが、コードの清潔性のため。

---

### 1-7. L-7 / L-8: デッドコード削除

**対象ファイル**:
- [storage.js](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/utils/storage.js) — `hasInProgressSession()` 関数
- [session.js](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/constants/session.js) — `DEFAULT_SESSION` 定数

**現状の問題**: どちらもプロジェクト内から一切参照されていないデッドコード。

**修正内容**:

storage.js:
```diff
- /**
-  * 中断中（未完了）のセッションが存在するか確認
-  * @returns {boolean}
-  */
- export function hasInProgressSession() {
-   const session = loadCheckSession();
-   return session !== null && session.status === "in_progress";
- }
```

session.js:
```diff
- export const DEFAULT_SESSION = {
-   currentIndex: 0,
-   answers: [],
-   memo: "",
- };
```

**ベストプラクティス**:
- デッドコードは「いつか使うかもしれない」で残さず、Git 履歴で追跡可能なので削除する
- 将来必要になった場合は Git の `blame` / `log` で復元が容易

**注意点**: 削除前に `grep` で本当に参照がないことを確認する。

**影響範囲**: なし。

---

### 1-8. L-1: StartScreen の不要コメント削除

**対象ファイル**: [StartScreen.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/StartScreen.jsx)

**修正内容**:
```diff
- // ... (中略) ...       ← L9: 意味不明なコメント
  export default function StartScreen({ onStart, onBack }) {

- {/* 日付入力は廃止 */}  ← L90: 削除済み機能への言及
```

**影響範囲**: なし。

---

### 1-9. L-2: CSS コメントの文字化け修正

**対象ファイル**: [index.css](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/index.css)

**修正内容** (L746):
```diff
- /* マ진を消して上部にピッタリ寄せる */
+ /* マージンを消して上部にピッタリ寄せる */
```

---

### 1-10. L-3: CSS の重複コメントアウト削除

**対象ファイル**: [index.css](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/index.css)

**修正内容** (L100):
```diff
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
- /* text-size-adjust: 100%; */
```

---

### 1-11. L-4: package.json のプロジェクト名修正

**対象ファイル**: [package.json](file:///c:/Users/t-matsuki/Desktop/CheckSheet/package.json)

**修正内容**:
```diff
- "name": "temp-vite",
+ "name": "survey-check-sheet",
```

**注意点**:
- `name` フィールドは npm レジストリへの公開には使用していないため安全に変更可能
- ただし CI/CD パイプラインやキャッシュで `name` を参照している場合は注意（現行の deploy.yml では参照していないことを確認済み）

---

### Phase 1 検証チェックリスト

- [x] `npm run build` が正常完了するか
- [x] `npm run preview` でアプリが正常動作するか
- [x] ホーム画面の進捗表示が `X/39項目` になっているか
- [x] ホーム画面の日付が正しくフォーマットされているか
- [x] ErrorBoundary の「ホームに戻る」がビルド版で動作するか
- [x] ESLint エラーがないか（`npm run lint`）

---

## Phase 2: データ整合性・安定性強化

> **目的**: セッションの状態管理における論理バグを修正し、データの不整合を防止する  
> **所要時間**: 2〜3時間  
> **リスク**: 低（ドメインロジックの修正だが、影響範囲は限定的。既存の動作テストで検証可能）

---

### 2-1. H-2: 結果画面からの回答修正遷移の正しい実装

**対象ファイル**:
- [App.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/App.jsx)
- [ResultScreen.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/ResultScreen.jsx)

**現状の問題**:
1. `handleEditFromResult(editIndex)` が `editIndex` を受け取るが `goToIndex` を呼んでいない
2. `ResultScreen` から渡される `editIndex` は `session.answers` 配列のインデックスだが、`goToIndex` が期待するのは `allItems` 配列のインデックス（チェック項目の全体通し番号）
3. `findIndex` の結果が `-1`（答えが見つからない）場合のガードがない

**修正内容**:

App.jsx:
```diff
+ import { getAllItems } from "./data/checkItems";

  const handleEditFromResult = (editIndex) => {
+   if (editIndex >= 0 && session?.answers?.[editIndex]) {
+     const allItems = getAllItems();
+     const targetItemId = session.answers[editIndex].itemId;
+     const itemIndex = allItems.findIndex(item => item.id === targetItemId);
+     if (itemIndex >= 0) {
+       goToIndex(itemIndex);
+     } else {
+       logger.warn("Edit target item not found in allItems", { editIndex, targetItemId });
+     }
+   }
    setScreen("check");
    logger.debug("Returning to check screen for edit", { index: editIndex });
  };
```

ResultScreen.jsx（防御的プログラミングの強化）:
```diff
  onClick={() => {
-   onEdit(session.answers.findIndex(a => a.itemId === item.id))
+   const idx = session.answers.findIndex(a => a.itemId === item.id);
+   if (idx >= 0) {
+     onEdit(idx);
+   } else {
+     logger.warn("Answer not found for item", { itemId: item.id });
+   }
  }}
```

**ベストプラクティス**:
- インデックスの意味（何の配列のインデックスか）をコメントで明示する
- 配列の `findIndex` 結果は必ず `-1` チェックを行う
- 型の不一致（answers index vs items index）はドメインレベルのバグに繋がるため、変換ロジックを `domain/sessionLogic.js` に集約することも検討

**影響範囲**:
- `App.jsx` の `handleEditFromResult` 関数
- `ResultScreen.jsx` の各アイテムの `onClick` ハンドラ
- `useCheckSession` フック経由で `goToIndex` が呼ばれる

**注意点**:
- `getAllItems()` を `App.jsx` で呼ぶことになるため、import が必要
- `goToIndex` 呼び出し後に `setScreen("check")` を呼ぶのは順序として問題ない（React のバッチ更新により１回のレンダリングにまとめられる）
- 修正後は以下のシナリオを**必ずテスト**すること：
  1. 全項目回答 → 結果画面 → 3番目の項目をタップ → チェック画面に戻り、Q3 が表示される
  2. 修正して回答 → 再び結果画面 → 修正が反映されている

---

### 2-2. H-3: `isSessionCompleted` の判定ロジック修正

**対象ファイル**: [sessionLogic.js](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/domain/sessionLogic.js)

**現状の問題**:
- `answers.length === totalItems` で完了判定しているが、`updateAnswersList` は既存回答を上書きするため、重複 `itemId` がなくても `length` だけでは正確でない
- エッジケース: 何らかの原因で同じ `itemId` が2件 `answers` に入った場合、未回答項目があっても完了と判定されうる

**修正内容**:
```diff
  export function isSessionCompleted(answers, totalItems) {
-   return answers.length === totalItems;
+   const uniqueItemIds = new Set(answers.map(a => a.itemId));
+   return uniqueItemIds.size >= totalItems;
  }
```

**ベストプラクティス**:
- 完了判定は「ユニークな回答済み項目数」で行うのが堅牢
- `>=` を使うのは防御的コーディング（データ不整合で `totalItems` を超える場合もエラーにしない）
- 将来的には `allItems` の全 ID を持ち、差分で「未回答リスト」を返す関数も有用

**影響範囲**:
- `CheckSessionContext.jsx` の `ANSWER_QUESTION` reducer 内から呼ばれる
- 完了判定の結果が `session.status` に反映される
- 現行ではこのロジックバグが発現するのは「回答修正後に再度回答する」ケースのみなので、通常フローへの影響は限定的

**検証方法**:
1. 全39項目を回答 → 完了画面が表示される
2. 結果画面から1項目を修正 → 再回答 → 引き続き完了状態が維持される
3. 途中で中断 → 再開 → 残りを回答 → 正しく完了になる

---

### 2-3. H-4: PDF 生成のエラーハンドリング改善

**対象ファイル**:
- [pdfGenerator.js](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/utils/pdfGenerator.js)
- [ResultScreen.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/ResultScreen.jsx)

**現状の問題**:
- `pdfGenerator.js` 内で `alert()` を直接呼んでいる
- ユーティリティ（Infrastructure層）が UI の責務を持つのは設計違反
- テスト時に `alert` をモックする必要が生じる

**修正内容**:

pdfGenerator.js:
```diff
  } catch (error) {
    logger.error("PDF生成失敗", error);
-   alert("PDF出力に失敗しました。もう一度お試しください。");
-   return false;
+   throw error;  // UI層にエラーを伝播させる
  }
```

ResultScreen.jsx:
```diff
+ const [pdfError, setPdfError] = useState(null);

  const handlePdfExport = async () => {
    if (!pdfRef.current || isPdfGenerating) return;

    setIsPdfGenerating(true);
+   setPdfError(null);
    try {
      const dateStr = session.completedAt ? new Date(session.completedAt).toLocaleDateString("ja-JP").replace(/\//g, "") : "";
      const exportData = { ...session, date: dateStr };
      logger.info("PDF export started", { checkId: session.checkId });
      await generatePDF(pdfRef.current, exportData);
      logger.info("PDF export successful");
    } catch (error) {
      logger.error("PDF generation failed", error, { checkId: session.checkId });
+     setPdfError("PDF出力に失敗しました。もう一度お試しください。");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // JSX 内（PDF出力ボタンの下あたり）
+ {pdfError && (
+   <div className="pdf-error-message" style={{
+     color: "var(--color-danger)",
+     fontSize: "var(--font-size-sm)",
+     textAlign: "center",
+     marginTop: "var(--space-2)",
+     animation: "fadeIn 0.3s ease"
+   }}>
+     {pdfError}
+   </div>
+ )}
```

**ベストプラクティス**:
- Infrastructure レイヤーの関数は **例外のスロー** または **Result 型の返却** でエラーを伝達する
- UI レイヤーでエラーを表示する（`alert` は UX が悪い上にスレッドをブロックする）
- 将来的にトースト通知コンポーネントを導入する場合も、この構造なら差し替えが容易

**注意点**:
- `pdfGenerator.js` の修正により、呼び出し元が `try-catch` で補足しないと未処理例外になる
- `ResultScreen.jsx` のエラーハンドリングが既に `try-catch` になっているため、`throw` の伝播は問題なし
- `pdfError` 表示用のスタイルは Phase 3 で CSS クラスに移行予定だが、Phase 2 では最低限のインラインスタイルで仮実装する

---

### 2-4. M-9: セッション完了時のデータ保存修正

**対象ファイル**: [CheckSessionContext.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/providers/CheckSessionContext.jsx)

**現状の問題**:
- L124-132 の自動保存 `useEffect` が `IN_PROGRESS` ステータスのセッションのみ保存している
- セッションが `COMPLETED` に遷移した瞬間、LocalStorage への保存が停止する
- 結果画面でメモを編集しても保存されない
- PDF出力前にブラウザを閉じると完了データが失われる

**修正内容**:
```diff
  useEffect(() => {
-   if (state.session && state.session.status === SESSION_STATUS.IN_PROGRESS) {
+   if (state.session) {
      try {
        saveCheckSession(state.session);
      } catch (err) {
        logger.error("Failed to save session auto-sync", err);
      }
    }
  }, [state.session]);
```

**ベストプラクティス**:
- セッションの永続化はステータスに依存せず、常に最新の状態を保存すべき
- 「完了後は保存不要」という暗黙の前提は、機能追加時にバグの温床になる
- 完了セッションを明示的にクリアするのは `resetAll()` の責務

**影響範囲**:
- `CheckSessionContext.jsx` の auto-sync `useEffect` のみ
- 結果画面でのメモ編集がLocalStorageに正しく反映されるようになる
- 副作用として、完了セッションが LocalStorage に残るが、これは `resetAll()` で正しくクリアされる

**注意点**:
- この修正により、完了セッション → ホーム画面に戻る → 再度ホームを開いた場合に `loadCheckSession` で completed セッションが読み込まれるが、`CheckSessionContext` の初回読み込みで `IN_PROGRESS` 以外はフィルタしているため問題ない
- ただし将来的に「完了セッションの履歴閲覧」機能を追加する場合は、この保存データを活用可能

**検証方法**:
1. 全項目回答 → 結果画面 → メモ編集 → ブラウザを閉じる → 再度開く → 直前の状態が保持されていないことを確認（`resetAll` が呼ばれるため）
2. 全項目回答 → 結果画面 → メモ編集 → PDF出力 → メモが反映されていることを確認

---

### Phase 2 検証チェックリスト

- [x] 結果画面で項目タップ → チェック画面で該当質問が表示される
- [x] 全問回答後、1問修正しても完了判定が崩れない
- [x] PDF 出力失敗時に `alert()` ではなく画面内にエラーが表示される
- [x] 結果画面でメモ編集 → ブラウザリロード → メモが保持されている（完了状態でもLocalStorageに保存される）
- [x] `npm run build` が正常完了するか
- [x] `npm run lint` がエラーなしか

---

## Phase 3: コード品質・可読性改善

> **目的**: マジックストリングの排除、React のベストプラクティスに沿ったパターン適用、スタイルの一貫性確保  
> **所要時間**: 3〜4時間  
> **リスク**: 低〜中（広範囲のファイル変更だが、動作変更は最小限。段階的にコミット可能）

---

### 3-1. M-2: 画面名の定数化

**対象ファイル**:
- [NEW] `src/constants/screens.js`
- [MODIFY] [App.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/App.jsx)

**現状の問題**:
- 画面遷移が `setScreen("home")`, `setScreen("check")` などのマジックストリングで行われている
- typo（例: `"hone"` と打ち間違えても実行時エラーにならず、ただ何も表示されないだけ）

**修正内容**:

新規ファイル `src/constants/screens.js`:
```js
/**
 * アプリケーション画面名の定数
 * マジックストリングを排除し、typo を防止する
 */
export const SCREENS = Object.freeze({
  HOME: "home",
  START: "start",
  CHECK: "check",
  RESULT: "result",
});
```

App.jsx の変更:
```diff
+ import { SCREENS } from "./constants/screens";

- const [screen, setScreen] = useState("home");
+ const [screen, setScreen] = useState(SCREENS.HOME);

- setScreen("start");
+ setScreen(SCREENS.START);
// ... 以下すべてのsetScreen呼び出しを置換
```

**ベストプラクティス**:
- `Object.freeze` で定数の不変性を保証する
- 将来的にルーティングライブラリ（react-router 等）を導入する際の移行ポイントが明確になる
- IDE の補完機能で入力ミスを防止可能

**影響範囲**: `App.jsx` 内の全 `setScreen` 呼び出し（約10箇所）。props 経由で他コンポーネントには画面名文字列を渡していないため安全。

---

### 3-2. M-3: ChatCheck の状態同期パターン改善

**対象ファイル**: [ChatCheck.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/ChatCheck.jsx)

**現状の問題**:
- L32-45 でレンダリング中に `setState`（`setPrevId`, `setCurrentInputs`, `setAnimKey`）を呼んでいる
- React 19 の Strict Mode ではコンポーネントが2回レンダリングされるため、`setAnimKey(prev => prev + 1)` が2回実行され、アニメーションキーが2つ進む

**修正内容**:
```diff
- const [prevId, setPrevId] = useState(currentItem?.id);
-
- if (currentItem && currentItem.id !== prevId) {
-   setPrevId(currentItem.id);
-   const existing = answers.find(a => a.itemId === currentItem.id);
-   setCurrentInputs(existing?.inputs || {});
-   setAnimKey(prev => prev + 1);
-   logger.debug("Current item changed (Reset state)", { ... });
- }
+ useEffect(() => {
+   if (currentItem) {
+     const existing = answers.find(a => a.itemId === currentItem.id);
+     setCurrentInputs(existing?.inputs || {});
+     setAnimKey(prev => prev + 1);
+     logger.debug("Current item changed (Reset state)", {
+       index: currentIndex,
+       id: currentItem.id,
+       hasExistingAnswer: !!existing,
+     });
+   }
+ }, [currentItem?.id]);
```

**ベストプラクティス**:
- 副作用（状態リセット、ログ出力）は `useEffect` で分離する
- 依存配列 `[currentItem?.id]` により、質問が変わった時のみ発火
- `prevId` state が不要になるため、コンポーネントの state がシンプルになる

**注意点**:
- `useEffect` はレンダリング後に実行されるため、一瞬前の `currentInputs` が表示される可能性がある
- ただし、`setCurrentInputs` → 再レンダリングは同期的に行われるため、視覚的な影響は無視できる
- `answers` を依存配列に含めないこと（含めると回答のたびに入力がリセットされる）
- ESLint の `react-hooks/exhaustive-deps` 警告が出る場合は、`// eslint-disable-next-line` で明示的に抑制し、理由をコメントする

**影響範囲**: `ChatCheck.jsx` のみ。子コンポーネントへの props インターフェースは変更なし。

---

### 3-3. M-4: インラインスタイルの CSS クラス化

**対象ファイル**:
- [index.css](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/index.css) — クラスの追加
- [AnswerControls.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/check/AnswerControls.jsx)
- [QuestionRenderer.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/check/QuestionRenderer.jsx)
- [StartScreen.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/StartScreen.jsx)

**PDFTemplate.jsx は除外**: html2canvas ではインラインスタイルが最も確実にキャプチャされるため、PDFTemplate のインラインスタイルは維持する。ただし理由をコメントで明記する。

**修正の方針**:

1. `AnswerControls.jsx` のバリデーションメッセージ
```diff
  {isInputIncomplete && (
-   <div className="validation-message" style={{ color: "var(--color-danger)", fontSize: "var(--font-size-xs)", fontWeight: "bold", textAlign: "center", marginBottom: "var(--space-2)", animation: "fadeIn 0.2s ease" }}>
+   <div className="validation-message">
```

index.css に追加:
```css
.validation-message {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-align: center;
  margin-bottom: var(--space-2);
  animation: fadeIn 0.2s ease;
}
```

2. `AnswerControls.jsx` の disabled ボタン
```diff
- style={isInputIncomplete ? { opacity: 0.5, filter: "grayscale(1)", cursor: "not-allowed" } : {}}
+ // CSSクラスで制御（className に既に "disabled" が条件付き追加されている）
```

index.css に追加:
```css
.answer-btn.disabled {
  opacity: 0.5;
  filter: grayscale(1);
  cursor: not-allowed;
}
```

3. `QuestionRenderer.jsx` のフォームエリア
```diff
- <div className="item-inputs-area" style={{ marginBottom: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
+ <div className="item-inputs-area">
```

index.css に追加:
```css
.item-inputs-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.item-input-group label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  display: block;
}
```

4. `StartScreen.jsx` のメモラベル
```diff
- <span style={{fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: "normal"}}>(任意)</span>
+ <span className="form-label-optional">(任意)</span>
```

index.css に追加:
```css
.form-label-optional {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: var(--font-weight-normal);
}
```

5. `PDFTemplate.jsx` にはコメントを追加:
```diff
+ {/* 
+   注意: PDFTemplate のスタイルはインラインで維持する。
+   html2canvas は外部CSSの解釈が不完全な場合があるため、
+   レイアウトの正確なキャプチャにはインラインスタイルが最も信頼性が高い。
+ */}
  <div 
    ref={ref} 
    className="pdf-container" 
    style={{ ... }}
  >
```

**ベストプラクティス**:
- デザインシステム（CSS変数）が存在するなら、すべてのスタイルはそれを経由すべき
- インラインスタイルは React の `style` prop のオブジェクト生成コストもある
- 例外がある場合（PDFTemplate）は理由を明記してチーム共有する

**影響範囲**: 見た目の変更はゼロ（同等のスタイルをCSSクラスに移動するだけ）。

---

### 3-4. M-8: 用語の統一と欠損CSSの追加

**対象ファイル**:
- [MatrixView.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/check/MatrixView.jsx) — 用語修正
- [index.css](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/index.css) — 欠損CSS追加

**修正内容**:

MatrixView.jsx:
```diff
- <div className="matrix-hint">※解答済みの番号をタップすると修正できます</div>
+ <div className="matrix-hint">※回答済みの番号をタップすると修正できます</div>
```

index.css（`result-category-hint` のCSS追加）:
```css
.result-category-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
  text-align: right;
}
```

**影響範囲**: 表示テキストの修正。動作への影響なし。

---

### 3-5. CSS 重複定義の解消

**対象ファイル**: [index.css](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/index.css)

**現状の問題**: `.check-screen` が L525-530 と L535-542 で2度定義されている。

**修正内容**: 最初の定義（L525-530）を削除し、後の定義（L535-542）に統合する。
```diff
- /* L525-530: 重複定義（削除） */
- .check-screen {
-   display: flex;
-   flex-direction: column;
-   min-height: 100vh;
-   min-height: 100dvh;
- }
-
  /* L535-542: 正しい定義（維持） */
  .check-screen {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }
```

**注意点**: 最初の定義は `min-height`、後の定義は `height` + `overflow: hidden` という異なる意図がある。ただし CSS のカスケードにより後者が優先されているため、前者は無効。削除して問題なし。

---

### Phase 3 検証チェックリスト

- [x] `npm run build` が正常完了するか
- [x] `npm run lint` がエラーなしか
- [x] 全画面遷移が正常に動作するか（home → start → check → result → home）
- [x] インラインスタイル削除後のレイアウトがビフォア/アフターで一致しているか
- [x] ChatCheck の質問切替アニメーションが正常動作するか
- [x] AnswerControls の disabled 時のスタイルが適用されているか
- [x] MatrixView のヒントテキストが「回答済み」になっているか
- [x] ResultScreen のカテゴリヒントにスタイルが適用されているか

---

## Phase 4: アーキテクチャ改善

> **目的**: 保守性・拡張性の根本的な向上。CSS のモジュール化とパフォーマンス最適化  
> **所要時間**: 1〜2日  
> **リスク**: 中（広範囲のファイル構造変更を伴う。段階的コミットと十分なテストが必要）

> [!WARNING]
> Phase 4 は Phase 1〜3 の完了後に着手すること。特に Phase 3 の CSS クラス化が完了していないと、CSS Modules への移行時に混乱が生じる。

---

### 4-1. M-1: CSS のコンポーネント分割（CSS Modules 導入）

**現状の問題**:
- `index.css` が 1,360 行の単一ファイル
- コンポーネントと CSS の対応関係が不明確
- クラス名の衝突リスク（現時点では発生していないが、規模拡大時に問題になる）

**移行方針**:

1. `index.css` を以下の構造に分割する:

```
src/
├── styles/
│   ├── global.css          # リセット、body、#root、CSS変数、アニメーション定義
│   ├── components.css      # ボタン、フォーム、モーダルなど共通UIパーツ
│   └── (将来: tokens.css)  # デザイントークン分離時
├── components/
│   ├── HomeScreen.jsx
│   ├── HomeScreen.module.css      # ホーム画面固有スタイル
│   ├── StartScreen.jsx
│   ├── StartScreen.module.css
│   ├── ChatCheck.jsx
│   ├── ResultScreen.jsx
│   ├── ResultScreen.module.css
│   ├── InstallPrompt.jsx
│   ├── InstallPrompt.module.css
│   └── check/
│       ├── ChatCheck.module.css   # チェック画面固有スタイル
│       ├── MatrixView.module.css
│       └── PDFTemplate.module.css
```

2. 共通スタイル（`.btn`, `.form-input`, `.modal-*` など）は `styles/components.css` に残す
3. 画面固有のスタイルを各 `.module.css` に移動

**ベストプラクティス**:
- Vite は CSS Modules をネイティブサポートしているため、追加のプラグインは不要
- `.module.css` のクラス名は自動的にユニーク化されるため、命名衝突が原理的に発生しない
- グローバルなスタイル（`:root`, `body`, アニメーション定義）は CSS Modules に含めない
- 移行は **1コンポーネントずつ** 行い、各ステップで動作確認する

**注意点**:
- CSS Modules では `className` が `styles.checkScreen` のような形式になる
- ハイフン付きクラス名は `styles["check-screen"]` とブラケット記法を使うか、キャメルケースに変換する
- `check-screen` → `checkScreen` のような命名変換を一律で行うか、元の命名を維持するか事前に決定する

**影響範囲**: 全コンポーネント（ただし段階的に移行可能）。

---

### 4-2. M-7: 回答データ検索のパフォーマンス最適化

**対象ファイル**:
- [MatrixView.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/check/MatrixView.jsx)
- [ChatCheck.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/ChatCheck.jsx)
- [ResultScreen.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/ResultScreen.jsx)

**現状の問題**:
- `answers.find(a => a.itemId === item.id)` が複数箇所で繰り返し呼ばれている
- MatrixView では 39項目 × answers配列 の O(n²) ルックアップ

**修正内容**:

`useCheckSession.js` にメモ化された Map を追加:
```diff
+ import { useMemo } from "react";

  export function useCheckSession() {
    const context = useContext(CheckSessionContext);
    
    if (!context) {
      throw new Error("useCheckSession must be used within a CheckSessionProvider");
    }

+   // 回答のキャッシュ用Map（O(1)ルックアップ）
+   const answerMap = useMemo(() =>
+     new Map((context.session?.answers || []).map(a => [a.itemId, a])),
+     [context.session?.answers]
+   );

    return {
      ...context,
      progress: context.session?.answers?.length || 0,
+     answerMap,
    };
  }
```

各コンポーネントでの使用:
```diff
  // MatrixView.jsx 等
- const ans = answers.find(a => a.itemId === item.id);
+ const ans = answerMap.get(item.id);
```

**ベストプラクティス**:
- `useMemo` で Map を生成し、`answers` が変更された時のみ再計算
- 各コンポーネントが独自に検索ロジックを持つのではなく、フック層で統一提供する
- 現在の39項目では体感的な差はないが、100項目以上に拡張する際に効果を発揮

**影響範囲**: `useCheckSession` フックを使用する全コンポーネント（`ChatCheck`, `ResultScreen`）。ただし `answers.find` の呼び出しを `answerMap.get` に置き換えるだけで、動作変更はなし。

---

### 4-3. モーダルコンポーネントの共通化（追加改善）

**現状の問題**:
- `HomeScreen.jsx` と `ChatCheck.jsx` でモーダル（確認ダイアログ）が重複実装されている
- 同じ CSS クラス（`.modal-overlay`, `.modal-content`, `.modal-actions`）を使いながら、JSX が2箇所に散在

**修正内容**:

新規ファイル `src/components/common/ConfirmModal.jsx`:
```jsx
/**
 * 確認ダイアログの共通コンポーネント
 * @param {string} title - ダイアログタイトル
 * @param {ReactNode} message - メッセージ内容
 * @param {string} confirmLabel - 確認ボタンのラベル
 * @param {string} confirmVariant - 確認ボタンのバリアント ("danger" | "warning")
 * @param {function} onConfirm - 確認時のコールバック
 * @param {function} onCancel - キャンセル時のコールバック
 */
export default function ConfirmModal({ 
  title, message, confirmLabel, confirmVariant = "danger", 
  onConfirm, onCancel 
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{title}</h2>
        <div className="modal-message">{message}</div>
        <div className="modal-actions">
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>
            キャンセル
          </button>
          <button className={`btn btn-${confirmVariant} btn-sm`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**ベストプラクティス**:
- DRY 原則の徹底（同じ構造のUIは共通化）
- props でバリエーションを制御し、利用側のコードを簡潔にする
- 将来的にアニメーション、アクセシビリティ（`aria-modal`, フォーカストラップ）の改善を1箇所で行える

---

### Phase 4 検証チェックリスト

- [x] CSS Modules 導入後、すべての画面のレイアウトが維持されているか
- [x] グローバルスタイル（ボタン、フォーム）が正常に適用されているか
- [x] モーダルが HomeScreen / ChatCheck の両方で正常動作するか
- [x] 全画面フロー（新規チェック → 回答 → 結果 → PDF出力 → ホーム）が正常動作するか
- [x] iPhone / iPad / PC のレスポンシブ表示が崩れていないか
- [x] `npm run build` の出力サイズが大幅に増加していないか

---

## 全体検証計画

### デバイス別テストマトリクス

| シナリオ | iPhone SE | iPhone 15 | iPad | PC (Chrome) |
|---|:---:|:---:|:---:|:---:|
| ホーム画面表示 | ○ | ○ | ○ | ○ |
| 新規チェック開始 | ○ | ○ | ○ | ○ |
| 39問回答フロー | ○ | ○ | - | ○ |
| 結果画面→修正→再回答 | ○ | ○ | - | ○ |
| PDF出力 | ○ | ○ | ○ | ○ |
| 中断→再開 | ○ | - | - | ○ |
| PWAインストール | ○ (Safari) | ○ (Safari) | ○ | - |
| オフライン動作 | ○ | - | - | ○ |
| ErrorBoundary リカバリー | - | - | - | ○ |

### 回帰テストシナリオ

各 Phase 完了時に以下を実行:

1. **ハッピーパス**: ホーム → 情報入力 → 39問全回答 → 結果確認 → PDF出力 → ホームに戻る
2. **中断・再開**: ホーム → 情報入力 → 途中まで回答 → 中断 → ホームで再開確認 → 続きから回答
3. **修正フロー**: 全問回答 → 結果画面で特定項目をタップ → 修正 → 結果に戻る
4. **破棄フロー**: 中断セッションあり → ホームで「破棄」→ 新規開始
5. **エラーケース**: ネットワーク遮断 → PDF出力試行 → エラーメッセージ確認

---

## リスク管理

| リスク | 発生確率 | 影響度 | 対策 |
|---|:---:|:---:|---|
| CSS Modules 導入時のスタイル崩れ | 中 | 高 | 1コンポーネントずつ移行。ビフォア/アフターのスクリーンショット比較 |
| `isSessionCompleted` 修正による完了判定の振る舞い変化 | 低 | 高 | 修正前後で同じテストシナリオを実行し結果を比較 |
| `useEffect` 移行による初期表示のフリッカー | 低 | 低 | `useLayoutEffect` への切り替えを検討（ただし SSR 対象外なので不要の可能性高） |
| PDF エラーハンドリング変更による既存ワークフローへの影響 | 極低 | 中 | `throw` 後の catch が確実に動作することを手動テストで確認 |
| `resumeSession.startedAt` が null のケース | 低 | 低 | 条件分岐で `-` を表示するフォールバックを実装 |

---

## 作業ログテンプレート

各 Phase の作業時に以下を記録すること:

```markdown
## Phase X 作業ログ

### 作業日時
- 開始: YYYY-MM-DD HH:mm
- 完了: YYYY-MM-DD HH:mm

### 変更ファイル一覧
- [ ] ファイル名 — 変更内容の要約

### テスト結果
- [ ] npm run build: PASS / FAIL
- [ ] npm run lint: PASS / FAIL
- [ ] 手動テスト: PASS / FAIL（詳細:）

### 発見した追加問題
-（あれば記載）

### デプロイ
- [ ] git push → GitHub Pages 自動デプロイ確認
```
