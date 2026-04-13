# プロジェクト包括レビュー報告書：測量前チェックシート (CheckSheet)

シニアソフトウェアアーキテクトとして、本プロジェクトを包括的に分析し、評価および改善案を提示します。

## 1. 全体評価（5段階）

*   **アーキテクチャ健全性**: ⭐⭐⭐⭐ (4/5)
    *   React Context + `useReducer` による明確な状態管理と、責務の分離が良好に行われています。
*   **保守性**: ⭐⭐⭐ (3/5)
    *   コードの可読性は高いですが、一部のコンポーネントにおける状態同期ロジックが将来的に不具合の温床となる可能性があります。
*   **拡張性**: ⭐⭐⭐⭐ (4/5)
    *   データとUIが疎結合であり、質問項目の追加や変更が容易な設計になっています。
*   **安定性**: ⭐⭐⭐ (3/5)
    *   PDF生成のDOM依存や、エラーハンドリングの不足が運用上のリスクとして残っています。

---

## 2. 重大問題（優先度：高）

### A. ChatCheckコンポーネントにおける「手動状態同期」の脆弱性
*   **問題内容**: `ChatCheck.jsx` にて `if (currentIndex !== prevIndex)` という独自の手動同期ロジックで `currentInputs` をリセット/設定しています。
*   **なぜ問題か**: Reactの標準的な宣言的UIの原則（Render中は副作用を起こさない）に反しており、競合状態や無限ループ、レンダリングの見落としを誘発しやすいためです。
*   **想定されるリスク**: 質問を高速で切り替えた際に、前の質問の入力値が一瞬残る、あるいは消えないといったUIの不整合。
*   **改善案**: `useEffect` を用いるか、あるいはそもそも `currentInputs` をコンポーネントローカルに持たず、Context側の `session.answers` から直接参照・更新する設計に簡素化する。

### B. PDF生成におけるDOM依存度の高さ
*   **問題内容**: `ResultScreen.jsx` で `display: absolute; left: -9999px` の隠し要素（`pdfRef`）を生成し、それを `html2canvas` で読み取っています。
*   **なぜ問題か**: ブラウザのレンダリングエンジンやOSのフォント環境に依存しやすく、スタイルが崩れたり、一部の端末でPDFが正常に生成されない事象が発生しやすいためです。
*   **想定されるリスク**: iPhone/Androidなどのモバイル環境で、生成されたPDFのレイアウトが崩れる。
*   **改善案**:
    1.  `jsPDF` の `autoTable` プラグインなど、DOMを介さず描画するライブラリを検討。
    2.  あるいは、PDF生成専用のクリーンなHTMLテンプレートをJS内で定義し、それをレンダリングしてキャプチャする（現在の「隠し要素」よりはマシだが、DOM依存は残る）。

---

## 3. 改善推奨（優先度：中）

### A. エラーハンドリングの標準化
*   **内容**: 現状、境界（Error Boundary）がなく、PDF生成失敗時も `alert` のみの簡易的な処理です。
*   **改善案**: アプリ全体または主要セクションに `ErrorBoundary` コンポーネントを導入し、クラッシュ時に自動復旧・ログ送信ができる仕組みを推奨します。

### B. 型定義（TypeScript）の未導入
*   **内容**: 複雑な `session` オブジェクト（ネストされた `answers` や `inputs`）を多用していますが、JSDocのみで管理されています。
*   **改善案**: 保守性を考慮し、TypeScriptを導入してスキーマ定義（`Session`, `CheckItem`, `Answer`）を確定させることを強く推奨します。

---

## 4. 軽微な改善（優先度：低）

*   **DRY違反の解消**: `getAllItems` と `TOTAL_ITEMS` が `checkItems.js` にありますが、UI側で再度 `useMemo` で集計している箇所（`ResultScreen.jsx`）があります。これらをContext側で一度だけ算出して提供すると効率的です。
*   **振動フィードバックの抽象化**: `ChatCheck.jsx` にハードコードされている `navigator.vibrate` を、`utils` またはカスタムフック `useFeedback` に抽出し、設定でON/OFFを切り替えられるようにします。

---

## 5. リファクタリング戦略（ロードマップ）

### Step 1: 状態管理のクリーンアップ（即時実施可能）
*   `ChatCheck.jsx` の `prevIndex` ロジックを削除し、Contextの値を正味のソース（Single Source of Truth）として扱うよう修正。

### Step 2: ログと例外処理の強化（運用安定化）
*   `utils/logger.js` を作成し、デバッグログを環境（dev/prod）に応じて整理。`ErrorBoundary` を追加。

### Step 3: プレゼンテーション層の整理（PDFロジックの改善）
*   `ResultScreen` からPDF生成用の巨大なJSXを分離し、独立した `PDFTemplate` コンポーネントまたは生成ロジックにする。

---

## 6. 理想的な構成案

将来的な機能拡張（複数現場の同時管理、写真添付機能など）を考慮した構成案です。

```
src/
├── core/               # ドメインロジック・型定義
│   ├── types.ts
│   └── constants.js
├── hooks/
│   ├── useCheckSession.js
│   └── useHaptics.js     # 振動などのフィードバック
├── providers/        # ステート管理
│   └── SessionProvider.jsx
├── services/          # I/O, API, PDF生成
│   ├── StorageService.js
│   └── ExportService.js
├── ui/              # 見た目と関心の分離
│   ├── atoms/       # ボタン、アイコン
│   ├── components/  # 複合部品（QuestionCardなど）
│   └── screens/     # Pageレベル
└── utils/           # 純粋関数ヘルパー
```

---

## 具体的なコード改善例：ChatCheck.jsx

**BEFORE:**
```javascript
const [prevIndex, setPrevIndex] = useState(currentIndex);
if (currentIndex !== prevIndex) {
  setPrevIndex(currentIndex);
  // ...副作用...
}
```

**AFTER (推奨):**
```javascript
// CurrentInputsをローカルに持たず、Context経由で同期
const currentItem = allItems[currentIndex];
const existingAnswer = answers.find(a => a.itemId === currentItem.id);

const handleInputChange = (label, value) => {
  const newInputs = { ...existingAnswer?.inputs, [label]: value };
  // answer自体を更新（または一時保存バッファをuseEffectで同期）
  updateAnswer(currentItem, existingAnswer?.answer || null, newInputs);
};
```
※このように「派生した状態」をReactのライフサイクルに合わせて扱うことで、予期せぬ挙動を防ぐことができます。

---
以上、レビュー報告とさせていただきます。
修正の実施が必要な箇所がございましたら、詳細なタスクとしてブレイクダウンいたします。
