# 測量前チェックシステム（CheckSheet） — 包括的コードレビュー

> **レビュー実施日**: 2026-04-13  
> **対象リポジトリ**: `tosio900/CheckSheet`  
> **技術スタック**: React 19 + Vite 5 + vite-plugin-pwa + html2canvas + jsPDF  
> **アプリ概要**: 建設測量現場向けのチャット型チェックシートPWA（39項目・6カテゴリ）

---

## 1. 総評

### 全体の品質

本アプリケーションは、**現場作業者が直感的に操作できるチェックシートPWA** として、堅実に設計・実装されています。ドメイン駆動の構造分離（`domain/sessionLogic.js`）、Context + useReducerによる状態管理、CSS Modulesへの移行など、アーキテクチャ面では適切なリファクタリングの成果が見られます。

全体的なコード品質は **中〜良** であり、小規模ツールとしては十分な水準ですが、実運用を見据えた場合にいくつかの改善余地があります。

### 良い点

| 観点 | 詳細 |
|------|------|
| **ドメイン分離** | `sessionLogic.js` に純粋関数としてビジネスロジックを分離。テスタブルで保守しやすい |
| **状態管理** | `useReducer` + Context パターンで一元管理。prop drilling も最小限に抑制 |
| **CSS設計** | CSS Custom Properties によるデザインシステム構築。CSS Modules で名前空間を確保 |
| **PWA対応** | `vite-plugin-pwa` による Service Worker 自動生成、オフラインサポート、installableな構成 |
| **アクセシビリティ** | `aria-label`、`focus-visible`、タッチターゲットサイズ（48px以上）の配慮 |
| **エラーハンドリング** | ErrorBoundary による包括的エラー捕捉。localStorage 操作の try-catch |
| **ロギング** | 環境別ログレベル制御。将来の外部連携を考慮した設計 |
| **iOS PWA対応** | safe-area、standalone 判定、InstallPrompt 等の iOS 特化対策 |
| **UXの工夫** | 振動フィードバック、自動スクロール、アニメーション、入力履歴の再利用 |
| **CI/CD** | GitHub Actions による自動デプロイが構成済み |

### 重大な懸念点

1. **`getAllItems()` が呼び出しのたびに新しい配列を生成** — レンダリング毎に呼ばれるため性能劣化・参照不安定の原因
2. **LocalStorage の容量制限への無対策** — データ損失リスク
3. **PDF生成（html2canvas）のクロスプラットフォーム信頼性** — 現場端末での動作保証が不明
4. **セッション排他制御の欠如** — 複数タブ同時操作でデータ破損の可能性

---

## 2. 指摘一覧

### 指摘 #01 — `getAllItems()` が毎回新規配列を生成

| 項目 | 内容 |
|------|------|
| **重要度** | 重大 |
| **種別** | 性能 / バグ懸念 |
| **対象箇所** | `src/data/checkItems.js` L246-258 `getAllItems()` |
| **問題点** | `getAllItems()` は呼ばれるたびに `[...item, categoryId, categoryName]` で新しい配列とオブジェクトを生成する。`ChatCheck.jsx` L16 で毎レンダリング呼ばれ、`App.jsx` L78 でも呼ばれている |
| **影響** | ① 毎レンダリングで O(N) のオブジェクト生成とGC圧力 ② `allItems` の参照が毎回変わるため、本来安定しているはずのデータが不安定に ③ `useMemo` や `React.memo` の最適化が効かない |
| **修正案** | モジュールレベルでキャッシュするか、遅延初期化パターンを使用する |

```javascript
// 修正例: モジュールレベル定数化
let _allItems = null;
export function getAllItems() {
  if (!_allItems) {
    _allItems = [];
    for (const category of categories) {
      for (const item of category.items) {
        _allItems.push({
          ...item,
          categoryId: category.id,
          categoryName: category.name,
        });
      }
    }
    Object.freeze(_allItems);
  }
  return _allItems;
}
```

---

### 指摘 #02 — LocalStorage 容量制限への無対策

| 項目 | 内容 |
|------|------|
| **重要度** | 高 |
| **種別** | バグ懸念 / セキュリティ |
| **対象箇所** | `src/utils/storage.js` L8-18 `saveCheckSession()` |
| **問題点** | LocalStorage は一般的に 5MB の制限がある。`saveCheckSession` の try-catch は `QuotaExceededError` を捕捉するが、呼び出し元（Context の `useEffect`）では `return false` が無視されている |
| **影響** | 容量超過時にセッションデータが保存されず、ユーザーは保存されたと思い込んでチェックを進めてしまう。現場でデータ消失する可能性がある |
| **修正案** | 保存失敗時にユーザーへ通知する仕組みを追加する |

```javascript
// CheckSessionContext.jsx の useEffect 内
useEffect(() => {
  if (state.session) {
    try {
      const success = saveCheckSession(state.session);
      if (!success) {
        // TODO: ユーザーへの保存失敗通知（Toast等）
        logger.warn("Session auto-save returned false");
      }
    } catch (err) {
      logger.error("Failed to save session auto-sync", err);
    }
  }
}, [state.session]);
```

---

### 指摘 #03 — 複数タブでのセッション競合

| 項目 | 内容 |
|------|------|
| **重要度** | 高 |
| **種別** | バグ懸念 |
| **対象箇所** | `src/providers/CheckSessionContext.jsx` L125-133 — `useEffect` での自動保存 |
| **問題点** | 複数タブで同時にアプリを開いた場合、各タブが独立して LocalStorage を読み書きする。後から書き込んだタブが先のタブのデータを上書きする（Last Write Wins） |
| **影響** | チェック中のデータが別タブの操作で破壊される可能性がある |
| **修正案** | `storage` イベントを監聴し、他タブからの変更を検知してユーザーに通知する |

```javascript
// 最小限の対策例
useEffect(() => {
  const handleStorage = (e) => {
    if (e.key === STORAGE_KEYS.SESSION) {
      logger.warn("Session data was modified from another tab");
      // ユーザーにリロード推奨を通知
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}, []);
```

---

### 指摘 #04 — PDF生成時の `sessionData.date` が未定義になりうる

| 項目 | 内容 |
|------|------|
| **重要度** | 高 |
| **種別** | バグ懸念 |
| **対象箇所** | `src/utils/pdfGenerator.js` L54 — `sessionData.date` の参照 |
| **問題点** | `generatePDF` は第2引数 `sessionData` に `date` プロパティを期待するが、これは `ResultScreen.jsx` L50 で `exportData` に付与される一時プロパティ。`session` のスキーマには `date` は存在しない。もし `completedAt` が null のまま呼ばれると、ファイル名が `測量前チェック_xxx_.pdf` となる |
| **影響** | ファイル名が不正になる。ファイルシステムによっては保存に失敗する可能性がある |
| **修正案** | `pdfGenerator.js` 内でファイル名の日付を生成し、外部から渡す必要をなくす |

```javascript
// pdfGenerator.js 内で生成
const dateStr = sessionData.completedAt
  ? new Date(sessionData.completedAt).toLocaleDateString("ja-JP").replace(/\//g, "")
  : new Date().toLocaleDateString("ja-JP").replace(/\//g, "");
const safeSiteName = (sessionData.siteName || "unknown").replace(/[\\/:*?"<>|]/g, "_");
const fileName = `測量前チェック_${safeSiteName}_${dateStr}.pdf`;
```

---

### 指摘 #05 — PDFファイル名にサニタイズがない

| 項目 | 内容 |
|------|------|
| **重要度** | 高 |
| **種別** | セキュリティ / バグ懸念 |
| **対象箇所** | `src/utils/pdfGenerator.js` L54 |
| **問題点** | `sessionData.siteName` がファイル名に直接使用されている。現場名に `/ \ : * ? " < > |` などの文字が含まれると、一部環境でファイル保存が失敗する |
| **影響** | PDF出力が無言で失敗する可能性がある |
| **修正案** | 上記 #04 の修正例にある `safeSiteName` パターンを適用する |

---

### 指摘 #06 — `useEffect` の依存配列の意図的除外

| 項目 | 内容 |
|------|------|
| **重要度** | 高 |
| **種別** | 保守性 / バグ懸念 |
| **対象箇所** | `src/components/ChatCheck.jsx` L36-48 — `eslint-disable` コメント |
| **問題点** | `answerMap` を依存配列から意図的に除外している。eslint-disable コメントで説明があるが、`currentItem?.id` のみに依存するこの設計は、`answerMap` が外部で更新された際に入力値が古いまま残るエッジケースを生む |
| **影響** | 結果画面から特定の質問に戻って修正した場合、入力値が正しく復元されないケースが起こりうる |
| **修正案** | `answerMap` の変更を検知しつつ、「回答直後のリセット」は避ける設計に変える。例えば、直前の回答アクションを ref で保持し、「自分の回答に起因する `answerMap` 変更」を除外する |

---

### 指摘 #07 — ErrorBoundary のフォールバックUIにスタイルが未定義

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | UI/UX |
| **対象箇所** | `src/components/common/ErrorBoundary.jsx` L32-55 — `error-fallback` 等の class |
| **問題点** | `.error-fallback`, `.error-fallback-content`, `.error-icon`, `.error-title`, `.error-message`, `.error-actions`, `.error-details` のいずれにも対応する CSS 定義が存在しない（index.css にもどの module.css にもない） |
| **影響** | エラー発生時のフォールバック画面がスタイルなしで表示され、ユーザーに不安を与える |
| **修正案** | `index.css` に `.error-fallback` 系のスタイルを追加 |

```css
.error-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-6);
}

.error-fallback-content {
  text-align: center;
  max-width: 320px;
}

.error-icon { font-size: 3rem; margin-bottom: var(--space-4); }
.error-title { font-size: var(--font-size-xl); margin-bottom: var(--space-3); }
.error-message { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-6); line-height: 1.6; }
.error-details { margin-top: var(--space-4); text-align: left; font-size: var(--font-size-xs); }
.error-details pre { overflow-x: auto; background: var(--color-border-light); padding: var(--space-3); border-radius: var(--radius-md); }
```

---

### 指摘 #08 — ResultScreen のメモ領域にグローバル class が未定義

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | UI/UX / 規約 |
| **対象箇所** | `src/components/ResultScreen.jsx` L87-96 — `result-memo-card`, `memo-label` |
| **問題点** | `className="result-memo-card"` と `className="memo-label"` はグローバルCSS class だが、対応するスタイル定義が `index.css` にも `ResultScreen.module.css` にもない |
| **影響** | メモ入力エリアにパディングや背景色が適用されず、他の要素と視覚的に不整合 |
| **修正案** | `ResultScreen.module.css` にスタイルを追加し、CSS Module として参照する |

---

### 指摘 #09 — CSS Modules とグローバル CSS の混在

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | 保守性 / 規約 |
| **対象箇所** | 複数ファイル全般 |
| **問題点** | CSS Modules への移行が途中で止まっており、以下のような混在がある: (1) `btn`, `btn-primary` 等はグローバル (`index.css`) (2) `focus-animation`, `always-open`, `main-question` もグローバル参照 (3) `result-item-edit-icon`, `answer-matrix-container` もグローバル (4) `form-input`, `form-group`, `form-label` 等のフォーム系もグローバル |
| **影響** | どの class がスコープされていてどれがグローバルかの判断が困難。CSS Modules の利点（名前衝突防止、死コード検出）が半減 |
| **修正案** | 方針の明確化が必要。**ボタン・フォーム等のユーティリティ系はグローバルに残す**という方針文書を `README` もしくは `docs/` に記載し、それ以外はモジュール化を完了させる |

---

### 指摘 #10 — `index.css` にデッドコード（使用されていない class）

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | 保守性 |
| **対象箇所** | `src/index.css` L596-621 — レスポンシブ内の `.question-text`, `.answer-btn`, `.home-logo`, `.home-title` |
| **問題点** | これらの class は CSS Modules 移行後は `styles["question-text"]` 等のハッシュ化された名前に変わっているため、グローバル CSS のメディアクエリ内での参照は効果がない |
| **影響** | レスポンシブ対応が実際には機能していない |
| **修正案** | 各 CSS Module ファイル内にメディアクエリを移動する |

---

### 指摘 #11 — `ConfirmModal` のオーバーレイクリックでモーダル閉じ

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | UI/UX |
| **対象箇所** | `src/components/common/ConfirmModal.jsx` L15 — `onClick={onCancel}` |
| **問題点** | オーバーレイ部分をクリックするとモーダルが閉じる設計は一般的だが、**破棄確認**のような破壊的操作のモーダルでは、誤タップで閉じてしまうリスクがある。特に現場では手袋着用での操作が想定される |
| **影響** | 「破棄して開始」の確認ダイアログが誤操作で消える可能性 |
| **修正案** | `confirmVariant="danger"` の場合はオーバーレイクリックでの閉じを無効にする |

```jsx
<div className="modal-overlay" onClick={confirmVariant === "danger" ? undefined : onCancel}>
```

---

### 指摘 #12 — モーダルのキーボード操作対応不足

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | UI/UX / アクセシビリティ |
| **対象箇所** | `src/components/common/ConfirmModal.jsx` |
| **問題点** | Escape キーでモーダルを閉じる機能がない。`role="dialog"`, `aria-modal="true"`, フォーカストラップも未実装 |
| **影響** | キーボードユーザーにとって操作困難。WAI-ARIA ガイドラインに非準拠 |
| **修正案** | `useEffect` で `keydown` イベントをリスンし、Escape でキャンセルを呼び出す |

---

### 指摘 #13 — `InstallPrompt` の iOS 判定ロジックの脆弱性

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | バグ懸念 |
| **対象箇所** | `src/components/InstallPrompt.jsx` L12 — `navigator.userAgent` |
| **問題点** | `navigator.userAgent` ベースの判定は将来的に信頼性が低下する。Apple は User-Agent 文字列の凍結を進めており、Chrome は既に UA Client Hints に移行済み。また `window.MSStream` は IE 向けの判定で iPad 誤判定を防ぐためのものだが、IE のサポート終了に伴い不要 |
| **影響** | 将来の iOS バージョンアップで判定が壊れる可能性がある |
| **修正案** | `navigator.standalone` と `matchMedia('(display-mode: standalone)')` を主判定に使い、UA 判定は補助に留める |

---

### 指摘 #14 — `SESSION_STATUS` が `Object.freeze` されていない

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | 保守性 |
| **対象箇所** | `src/constants/session.js` L5-8 |
| **問題点** | `SCREENS` は `Object.freeze` されているが、`SESSION_STATUS` と `STORAGE_KEYS` は freeze されていない。一貫性がない |
| **影響** | 他の開発者が誤って書き換える可能性（低いが、定数の設計意図として不整合） |
| **修正案** | `Object.freeze` を適用する |

---

### 指摘 #15 — `StartScreen` でレンダリングのたびに `loadUserProfile()` を呼ぶ

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | 性能 |
| **対象箇所** | `src/components/StartScreen.jsx` L11 — `const profile = loadUserProfile() \|\| {};` |
| **問題点** | `loadUserProfile()` は LocalStorage の `getItem` + `JSON.parse` を実行する。`StartScreen` が再レンダリングされるたびに呼ばれる |
| **影響** | 実際のパフォーマンス影響は小さいが、副作用を含む処理がレンダリングフェーズで呼ばれるのは React の設計原則に反する |
| **修正案** | `useState` の初期化関数で呼ぶ |

```javascript
const [profile] = useState(() => loadUserProfile() || {});
const [siteName, setSiteName] = useState(profile.siteName || "");
const [inspector, setInspector] = useState(profile.inspector || "");
```

---

### 指摘 #16 — `App.jsx` の画面ルーティングが将来スケールしない

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | 保守性 |
| **対象箇所** | `src/App.jsx` L125-163 — 条件分岐レンダリング |
| **問題点** | `{screen === SCREENS.HOME && (...)}` の羅列による画面切り替えは、画面数が増えるとメンテナンス困難。全画面のハンドラが `App` に集中しており、SRP に反する傾向 |
| **影響** | 設定画面・履歴画面等を追加する場合に `App.jsx` が肥大化する |
| **修正案** | 画面マッピングオブジェクトまたは簡易ルーターを導入する（現時点では4画面なので急ぎではない） |

---

### 指摘 #17 — `handleEditFromResult` の `findIndex` がO(N)走査

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | 性能 |
| **対象箇所** | `src/App.jsx` L74-89 — `handleEditFromResult` |
| **問題点** | `getAllItems().findIndex(item => item.id === targetItemId)` で毎回 O(N) 走査している。また、#01 の指摘通り `getAllItems()` 自体が新しい配列を生成する |
| **影響** | 39項目では実質問題ないが、設計としては非効率 |
| **修正案** | `getAllItems()` のキャッシュ化と合わせ、ID→Index のマッピングを事前構築する |

---

### 指摘 #18 — `ResultScreen` で未回答項目の表示に問題

| 項目 | 内容 |
|------|------|
| **重要度** | 高 |
| **種別** | バグ懸念 / UI/UX |
| **対象箇所** | `src/components/ResultScreen.jsx` L118-121 |
| **問題点** | 結果一覧でアイテムの `answer` が `null`（未回答）の場合、`item.answer === "yes"` は false になるため `<XCircle>` アイコンが表示される。しかし実際は「いいえと回答した」のではなく「未回答」である。`onEdit` の `findIndex` も `-1` を返す場合がある |
| **影響** | 未回答項目が「いいえ」と誤表示される。編集クリック時にインデックス -1 が `goToIndex` に渡される |
| **修正案** | 3状態（yes / no / unanswered）を明示的に区別して表示する |

```jsx
{item.answer === "yes" ? <CheckCircle ... />
 : item.answer === "no" ? <XCircle ... />
 : <span style={{ color: "var(--color-text-muted)" }}>—</span>}
```

---

### 指摘 #19 — `MatrixView` の `canAccess` 判定の不正確さ

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | バグ懸念 |
| **対象箇所** | `src/components/check/MatrixView.jsx` L40 — `const canAccess = i <= answerMap.size && i < allItems.length` |
| **問題点** | `answerMap.size` は回答済みの項目数だが、`i <= answerMap.size` は「回答済み数+1番目」まで許可する意図と思われる。ただし、順序通りに回答しない場合（マトリックスからジャンプした場合）、`answerMap.size` と実際にアクセスすべき範囲が一致しない |
| **影響** | 特定の操作順序で、本来アクセスできるべきセルがクリック不能になる、または逆にアクセスすべきでないセルがクリック可能になる |
| **修正案** | 「回答済みか、現在位置か、現在位置より前か」で判定する |

```javascript
const canAccess = answerMap.has(item.id) || i <= currentIndex;
```

---

### 指摘 #20 — `logger.error` のインターフェース不整合

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | 保守性 |
| **対象箇所** | `src/utils/logger.js` L23-32 |
| **問題点** | `logger.error` の定義は `(message, error, context)` の3引数だが、呼び出し側で一貫していない。`context` が省略されるケースが多く、将来 Sentry 連携時に `context` 情報が欠落する |
| **影響** | ロギングの品質が不均一 |
| **修正案** | すべての `logger.error` 呼び出しで context を明示的に渡すか、オプションオブジェクトパターンに変更する |

---

### 指摘 #21 — `generateCheckId()` のユニーク性不足

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | バグ懸念 |
| **対象箇所** | `src/utils/storage.js` L59-64 — `generateCheckId()` |
| **問題点** | `chk_20260409_123456` 形式で秒精度の ID を生成するが、1秒以内に2回「新規チェック開始」が押されると同じ ID が生成される |
| **影響** | 現在は単一セッションしか保持しないため実質問題ないが、将来的にセッション履歴を保持する設計に拡張した場合に ID 衝突が起こる |
| **修正案** | `crypto.randomUUID()` を使用するか、ミリ秒 + ランダム文字列を付加する |

```javascript
export function generateCheckId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6);
  return `chk_${dateStr}_${rand}`;
}
```

---

### 指摘 #22 — `html2canvas` + `jsPDF` の多ページ対応ロジック

| 項目 | 内容 |
|------|------|
| **重要度** | 高 |
| **種別** | バグ懸念 |
| **対象箇所** | `src/utils/pdfGenerator.js` L39-51 — 複数ページ処理 |
| **問題点** | 現在のロジックでは1枚のキャンバス画像を分割して各ページに配置しているが、ページ境界で質問項目がちょうど切れてしまう場合、テキストが途中で切断される |
| **影響** | 39項目のチェック結果を出力するとおそらく2〜3ページになるが、ページ境界でテキストが切れる |
| **修正案** | カテゴリ単位でカンバスを分割するか、jsPDF の autotable プラグインを使用してネイティブにテーブルを描画する方式に変更する |

---

### 指摘 #23 — `PDFTemplate` の `position: absolute; left: -9999px` 手法

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | 性能 / 保守性 |
| **対象箇所** | `src/components/check/PDFTemplate.jsx` L14-26 |
| **問題点** | PDF用テンプレートを `left: -9999px` で画面外に配置する手法は、① 常にDOMに存在しレンダリングコストがかかる ② スクリーンリーダーに読まれてしまう ③ `html2canvas` が正確にキャプチャできない端末がある |
| **影響** | アクセシビリティの問題、一部端末での PDF 出力不具合 |
| **修正案** | `aria-hidden="true"` を追加し、PDF生成時のみDOMに挿入する動的レンダリングに変更するのがベスト |

---

### 指摘 #24 — `PDFTemplate` に `displayName` が未設定

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | 保守性 / 規約 |
| **対象箇所** | `src/components/check/PDFTemplate.jsx` L109 |
| **問題点** | `React.forwardRef` で作成されたコンポーネントに `displayName` が設定されていない |
| **影響** | React DevTools でのデバッグ時に `ForwardRef` とだけ表示される |
| **修正案** | `PDFTemplate.displayName = "PDFTemplate";` を追加 |

---

### 指摘 #25 — `QuestionRenderer` の input に htmlFor/id ペアがない

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | UI/UX / アクセシビリティ |
| **対象箇所** | `src/components/check/QuestionRenderer.jsx` L13-23 |
| **問題点** | `<label>` と `<input>` が `htmlFor` / `id` で紐付けられていない。ラベルクリックでフォーカスが移動しない |
| **影響** | タッチ操作での入力しやすさが低下 |
| **修正案** | `<label htmlFor={...}>` と `<input id={...}>` のペアを追加 |

---

### 指摘 #26 — `sessionReducer` の `ANSWER_QUESTION` 内で副作用的な完了判定

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | 保守性 |
| **対象箇所** | `src/providers/CheckSessionContext.jsx` L40-68 — `ANSWER_QUESTION` case |
| **問題点** | reducer 内で `isSessionCompleted` を呼んで完了判定し、`COMPLETED` ステータスをセットしている。本来 reducer は状態遷移だけを担い、ビジネスロジック判定は外部で行うのが理想的 |
| **影響** | reducer が太り、テストが複雑になる |
| **修正案** | 現時点ではロジックが `sessionLogic.js` に委譲されているため許容範囲。将来的にミドルウェアパターンへの拡張を検討 |

---

### 指摘 #27 — index.css のPDFスタイルにハードコードされた色値

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | 規約 / 保守性 |
| **対象箇所** | `src/index.css` L462-540 — `.pdf-*` 系スタイル |
| **問題点** | CSS Custom Properties を使わずに色値がハードコードされている。PDFTemplate側はインラインスタイルを使用しており、これらのCSSクラスが実際に使用されているか不明（デッドコードの可能性） |
| **影響** | テーマ変更時にPDF関連スタイルだけ取り残される |
| **修正案** | PDF用スタイルがデッドコードかどうかを確認し、不要なら削除 |

---

### 指摘 #28 — `AnswerControls` のdisabled実装が不完全

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | UI/UX / バグ懸念 |
| **対象箇所** | `src/components/check/AnswerControls.jsx` L23-29 |
| **問題点** | 「はい」ボタンは `disabled={isInputIncomplete}` で HTML の disabled 属性が設定されているが、同時に `onClick={() => !isInputIncomplete && onAnswer("yes")}` でも JS 側でガードしている。二重実装 |
| **影響** | 保守コストが上がる |
| **修正案** | HTML `disabled` を信頼し、CSS は `:disabled` 擬似クラスで統一する |

---

### 指摘 #29 — `vite.config.js` の manifest アイコンパスに `base` が考慮されていない可能性

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | バグ懸念 |
| **対象箇所** | `vite.config.js` L20-31 — manifest icons の `src` |
| **問題点** | `src: 'icon-192x192.png'` は相対パスだが、GitHub Pages でのベースパスが `/CheckSheet/` の場合、Service Worker が manifest のアイコンパスを解決できない可能性がある（推測 — 実環境確認が必要） |
| **影響** | GitHub Pages でPWAインストール時にアイコンが表示されない可能性 |
| **修正案** | vite-plugin-pwa がビルド時に自動で base を付与するか確認 |

---

### 指摘 #30 — `theme_color` の不一致

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | 規約 |
| **対象箇所** | `index.html` L7 `#059669` vs `vite.config.js` L17 `#12b886` |
| **問題点** | 2つの `theme_color` 定義が異なる |
| **影響** | ブラウザ UI とPWAインストール時のスプラッシュ画面で色が異なる |
| **修正案** | `--color-primary-dark: #059669` に合わせて統一する |

---

### 指摘 #31 — `favicon.ico` が `includeAssets` に参照されているが存在しない

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | 規約 |
| **対象箇所** | `vite.config.js` L12 — `includeAssets: ['favicon.ico', ...]` |
| **問題点** | `public/` ディレクトリに `favicon.ico` は存在しない（`favicon.svg` のみ） |
| **影響** | ビルド時の警告、またはSW登録時のキャッシュエラー |
| **修正案** | `'favicon.ico'` → `'favicon.svg'` に修正 |

---

### 指摘 #32 — `checkItems.js` の改行コードの不統一

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | 規約 |
| **対象箇所** | `src/data/checkItems.js` |
| **問題点** | `checkItems.js` は CRLF (`\r\n`) だが、他のファイルは LF (`\n`) のみ |
| **影響** | diff の可読性低下 |
| **修正案** | `.editorconfig` でLF統一を設定 |

---

### 指摘 #33 — `handleMemoUpdate` が不要なラッパー

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | 保守性 |
| **対象箇所** | `src/App.jsx` L94-96 |
| **問題点** | `updateMemo` をそのまま透過しているだけの不要なラッパー関数 |
| **修正案** | `onUpdateMemo={updateMemo}` と直接渡す |

---

### 指摘 #34 — `index.html` の `<link rel="icon">` が大きいPNGを指定

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | 性能 |
| **対象箇所** | `index.html` L12 |
| **問題点** | ファビコンに 192x192 の PNG（383KB）を使用。`public/favicon.svg` (9.5KB) が存在する |
| **修正案** | SVG ファビコンを優先使用 |

---

### 指摘 #35 — テスト環境が一切ない

| 項目 | 内容 |
|------|------|
| **重要度** | 高 |
| **種別** | 保守性 |
| **対象箇所** | プロジェクト全体 |
| **問題点** | テストフレームワークが未導入。`sessionLogic.js` のような純粋関数が存在するにも関わらず、テストが一切ない |
| **影響** | リファクタリング・機能追加時のリグレッションを検出できない |
| **修正案** | Vitest を導入し、最低限 `sessionLogic.js` と `storage.js` のユニットテストを作成する |

---

### 指摘 #36 — `styles` ディレクトリが空

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | 保守性 |
| **対象箇所** | `src/styles/` ディレクトリ |
| **問題点** | 空のディレクトリが残っている |
| **修正案** | 削除するか、今後の共通スタイル置き場として使う場合は明記 |

---

### 指摘 #37 — `icon-192x192.png` と `icon-512x512.png` のファイルサイズが同一

| 項目 | 内容 |
|------|------|
| **重要度** | 中 |
| **種別** | 性能 |
| **対象箇所** | `public/icon-192x192.png` (383KB), `public/icon-512x512.png` (383KB) |
| **問題点** | 両ファイルが完全に同じサイズ（383,327 bytes）。512x512 の画像をそのまま 192x192 用にも置いている可能性が高い |
| **影響** | PWAキャッシュサイズの無駄 |
| **修正案** | 実際に 192x192 にリサイズした画像を用意。383KB は PNG としては大きすぎるため圧縮も検討 |

---

### 指摘 #38 — `StartScreen` がストレージに直接アクセス

| 項目 | 内容 |
|------|------|
| **重要度** | 低 |
| **種別** | 保守性 |
| **対象箇所** | `src/components/StartScreen.jsx` L2 |
| **問題点** | 他コンポーネントは Context 経由でデータ操作するが、`StartScreen` だけ直接 storage アクセスしている |
| **修正案** | `useUserProfile` フックを作成して統一する |

---

## 3. 優先度順の改善提案

### まず直すべきもの（緊急〜高）

| # | 指摘 | 作業量 |
|---|------|--------|
| 1 | #01 `getAllItems()` のキャッシュ化 | 小（15分） |
| 2 | #18 未回答項目の誤表示修正 | 小（30分） |
| 3 | #04 / #05 PDFファイル名のサニタイズとnull安全化 | 小（30分） |
| 4 | #07 ErrorBoundary フォールバック UI のスタイル追加 | 小（15分） |
| 5 | #31 `favicon.ico` → `favicon.svg` 修正 | 小（5分） |
| 6 | #30 `theme_color` の統一 | 小（5分） |
| 7 | #10 レスポンシブのデッドCSS修正 | 中（1時間） |

### 次に直すべきもの（中）

| # | 指摘 | 作業量 |
|---|------|--------|
| 8 | #08 メモ領域のスタイル追加 | 小（15分） |
| 9 | #19 MatrixView の canAccess 判定修正 | 小（15分） |
| 10 | #02 LocalStorage 保存失敗の通知 | 中（1時間） |
| 11 | #15 `StartScreen` の `loadUserProfile` を useState 初期化に移動 | 小（10分） |
| 12 | #12 モーダルのキーボード対応 | 中（45分） |
| 13 | #22 PDF多ページのテキスト切断対策 | 大（半日） |
| 14 | #37 PNGアイコンの正規化・圧縮 | 小（15分） |
| 15 | #35 Vitest 導入と基本テスト作成 | 中（2時間） |

### 余裕があれば改善したいもの（低）

| # | 指摘 | 作業量 |
|---|------|--------|
| 16 | #09 CSS Modules 方針の文書化 | 小 |
| 17 | #14 `SESSION_STATUS` の `Object.freeze` | 小 |
| 18 | #21 `generateCheckId` のユニーク性強化 | 小 |
| 19 | #24 `PDFTemplate.displayName` 追加 | 小 |
| 20 | #25 `QuestionRenderer` の label/id 紐付け | 小 |
| 21 | #32 改行コードの統一 + `.editorconfig` 追加 | 小 |
| 22 | #33 `handleMemoUpdate` の簡素化 | 小 |
| 23 | #34 SVG ファビコンの優先使用 | 小 |
| 24 | #36 空の `styles` ディレクトリ整理 | 小 |
| 25 | #03 複数タブのセッション競合対策 | 中 |
| 26 | #16 画面ルーティングの抽象化 | 中 |
| 27 | #06 useEffect の依存配列再設計 | 中 |

---

## 4. 実装方針への提案

### 設計上の見直し

1. **データアクセス層の統一**: 全データ操作を Context / Hook 経由に統一する。将来 IndexedDB 等に移行する場合の影響範囲を限定できる

2. **PDF 生成アーキテクチャの見直し**: `html2canvas` 方式はクロスプラットフォームでの安定性に限界がある。jsPDF の直接描画 + autotable プラグインへの移行を中期的に検討すべき

3. **状態永続化の堅牢化**: LocalStorage から IndexedDB への移行を検討。`idb` ライブラリ（keyval-store）を使えば最小限のコード変更で移行可能

### 分割すべき責務

| 現在の場所 | 分割先 | 理由 |
|-----------|--------|------|
| `App.jsx` の全画面ハンドラ | 各画面のローカルロジック + ルーター抽象 | App の行数と責務が増大傾向 |
| `ResultScreen.jsx` の PDF 関連ロジック | `hooks/usePdfExport.js` | UI とPDF生成ロジックの分離 |
| `StartScreen.jsx` のプロファイル読み書き | `hooks/useUserProfile.js` | データアクセスパターンの統一 |

### 追加するとよい共通処理

1. **Toast / Snackbar 通知コンポーネント**: LocalStorage 保存失敗、PDF生成成功/失敗等のフィードバックに使用
2. **日付フォーマットユーティリティ**: `new Date().toLocaleString("ja-JP")` が複数箇所に散在。`utils/dateFormat.js` に集約
3. **ファイル名サニタイズユーティリティ**: `utils/sanitize.js` で OS 依存の禁止文字を除去

### テスト追加候補

| テスト種別 | 対象 | 優先度 |
|-----------|------|--------|
| 単体テスト | `sessionLogic.js` の全関数 | 高 |
| 単体テスト | `storage.js` の保存/読込/削除 (localStorage モック) | 高 |
| 単体テスト | `generateCheckId()` のユニーク性 | 中 |
| 結合テスト | `CheckSessionContext` + `useCheckSession` の状態遷移 | 中 |
| E2E テスト | 「新規→チェック→完了→PDF出力」のハッピーパス | 中 |
| 視覚回帰テスト | 主要画面のスクリーンショット比較 | 低 |

---

## 5. 追加で確認が必要な点

### コードだけでは判断しづらい点

1. **iPad での html2canvas の動作実績**: 現場で実際に iPad / iPhone を使って PDF 出力を行った実績があるか
2. **39項目は今後増える予定か**: 項目数が増えると MatrixView の横スクロール UX が悪化する
3. **オフライン運用の実態**: 初回アクセスはオンライン必須。現場のネットワーク環境を確認する必要がある
4. **過去のチェック結果の保存・閲覧要件**: 現在は単一セッションのみ。履歴機能の要否を確認

### 実行環境や要件確認が必要な点

1. **対象端末**: iPad (iOS Safari) / Android タブレット / PC — それぞれでの動作確認状況
2. **PDFの利用シーン**: 生成したPDFは誰がどこで閲覧するか。印刷が必要か、メール送付か
3. **セキュリティ要件**: 現場名・点検者名は個人情報に該当するか。LocalStorage への平文保存の是非
4. **同時利用者数**: 複数人が同じ端末で交互に使うケースはあるか

---

## 6. 緊急対応が必要な箇所のリスト

| # | 箇所 | リスク | 根拠 |
|---|------|--------|------|
| 1 | `getAllItems()` のキャッシュ不在 | 性能劣化 + 参照不安定 | 毎レンダリングで新規配列生成 |
| 2 | PDFファイル名の未サニタイズ | PDF出力失敗 | OS禁止文字が混入可能 |
| 3 | 未回答項目が「いいえ」と表示される | ユーザー混乱 | 3状態の未区別 |
| 4 | ErrorBoundary のスタイル未定義 | エラー時のUX崩壊 | CSS定義なし |

## 7. 将来の障害要因になりそうな箇所のリスト

| # | 箇所 | リスク | 条件 |
|---|------|--------|------|
| 1 | `html2canvas` ベースのPDF生成 | クロスプラットフォーム不具合 | iPad Safari での大量項目レンダリング |
| 2 | LocalStorage 依存 | 容量制限・データ消失 | セッション履歴機能の追加時 |
| 3 | 画面ルーティングの条件分岐 | `App.jsx` の肥大化 | 画面数の増加 |
| 4 | CSS Modules とグローバル CSS の混在 | スタイル管理の混乱 | チーム開発・共通コンポーネント追加時 |
| 5 | `navigator.userAgent` ベースの iOS 判定 | 判定の誤動作 | iOS のUA文字列凍結 |
| 6 | 複数タブでのセッション競合 | データ破損 | ユーザーが複数タブ操作した場合 |
| 7 | `checkItems.js` のデータ構造 | 柔軟性不足 | 質問タイプの多様化（選択肢、写真添付等） |

## 8. 自動テストと手動レビューの切り分け

### 自動テストで検出しやすい問題

| 問題 | テスト手法 |
|------|-----------|
| `sessionLogic.js` の回答集計・完了判定 | Vitest 単体テスト |
| `storage.js` の保存/読込/削除 | Vitest + localStorage モック |
| `generateCheckId()` のフォーマット検証 | Vitest 単体テスト |
| 未回答時の `findIndex` が -1 を返す問題 | Vitest + 結合テスト |
| `canAccess` 判定のエッジケース | Vitest + MatrixView のロジック抽出 |
| CSS Modules のデッドクラス参照 | ESLint + stylelint |
| 改行コード不統一 | `git diff --check` / `.editorconfig` |
| 未使用の import | ESLint `no-unused-vars` |
| React hooks の依存配列 | ESLint `react-hooks/exhaustive-deps` |

### 手動レビューが必要な問題

| 問題 | 理由 |
|------|------|
| HTML2Canvas のクロスプラットフォーム動作 | 実機テストが不可欠 |
| PDF のページ境界でのテキスト切断 | 視覚的確認が必要 |
| UI/UX の操作導線の自然さ | ユーザーテストが必要 |
| モバイル端末での手袋操作時のタッチ精度 | 実環境テストが必要 |
| オフラインでのPWA動作 | ネットワーク遮断テストが必要 |
| セキュリティ（LocalStorage の平文データ） | 要件定義に依存 |
| 現場でのPDF保存先の確認 | ユーザーヒアリングが必要 |

---

> **レビュア注記**: 本レビューはソースコード静的分析に基づいています。実際の動作確認（特に iPad Safari での PDF 出力）は行っていません。指摘事項は重要度の高いものから順に対応することを推奨します。
