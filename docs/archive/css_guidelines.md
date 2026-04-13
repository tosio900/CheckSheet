# CheckSheet CSS ガイドライン

## 1. 目的
本プロジェクトでは、CSSの保守性向上と意図しないスタイルの衝突（カスケーディング汚染）を防ぐため、**CSS Modules**を中心としたスタイリング戦略を採用します。ただし、アプリ全体で共通する汎用的なUIコンポーネントや基盤スタイルについては、引き続きグローバルCSSで管理します。

本ドキュメントは「グローバルで維持すべきクラス」と「モジュール化すべきクラス」の境界を明確にし、今後の継続的なリファクタリング方針を定義するルールブックです。

## 2. CSS管理戦略

### 2.1. グローバルCSSとして維持するもの (`index.css`)
アプリ全体で再利用・定義される以下のようなリセット、変数、レイアウト、汎用コンポーネントは、`index.css` にてグローバルクラスとして維持します。

- **CSS Variables （カスタムプロパティ）**
  - テーマカラー、フォント、余白、影などの `--color-primary` 系
- **リセット／ベーススタイル**
  - `*`, `body`, `html`, `#root`, `a` などの基本要素
- **アニメーション定義**
  - `@keyframes` 系の定義と、汎用の `.focus-animation` など
- **アプリケーションルート・全体レイアウト**
  - `.app` など
- **汎用ボタン（Button）**
  - `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-warning`, `.btn-ghost`, `.btn-sm`, `.btn-lg`, `.btn-block`
- **汎用フォーム（Form）**
  - `.form-group`, `.form-label`, `.form-input`, `.form-error`
- **モーダル（Modal）**
  - `.modal-overlay`, `.modal-content`, `.modal-title`, `.modal-message`, `.modal-actions`
- **ローディングインジケーター**
  - `.loading-spinner`
- **ErrorBoundary（エラーフォールバック）**
  - `.error-fallback` 系クラス
- **PDF出力用スタイル** ※将来的に依存を完全に切り離せるまでは維持
  - `.pdf-container`, `.pdf-header`, `.pdf-info`, `.pdf-category-title`, `.pdf-item` 系

### 2.2. CSS Modules に分離するもの (`[Component].module.css`)
上記の汎用要素以外の、**画面（Screen）や特定のコンポーネント固有のスタイル**は、必ずCSS Modulesを使用します。
各コンポーネントは同じディレクトリ内の `.module.css` ファイルから `styles` をインポートして使用してください。

**対応例:**
- `HomeScreen` 固有のメインメニュー → `HomeScreen.module.css` (対応済)
- `ChatCheck` のチェックフロー表示 → `ChatCheck.module.css` (対応済)
- `ResultScreen` の判定結果ビュー → `ResultScreen.module.css` (対応済)
- `MatrixView` の進捗マトリクス → `MatrixView.module.css` (対応済)

## 3. 今後のリファクタリング方針（段階的モジュール化）

未整理のグローバルクラス（例: `.main-question`, `.always-open` など）がjsxファイル内に直接パス指定されている場合は、発見次第段階的にCSS Modulesへ移管します。

### モジュール化のステップ変更
1.  **特定**: 汎用でない（特定コンポーネントでのみ使われている）グローバルクラスを発見。
2.  **移動**: 該当のクラス名を小文字ケバブケースからキャメルケースまたはケバブ文字（`['...']` 呼び出し用）に変更のうえ、関連する `.module.css` に移動。
3.  **適用**: コンポーネント側で `className={styles['class-name']}` や `${styles.className}` のように呼び出し方に変更。

もし汎用的にするべきか固有のものにすべきか迷った場合は、**原則としてCSS Modulesによるローカルスコープを優先**してください。後から本当に汎用化が必要になった場合のみ、共通コンポーネントとして抽出し `index.css` に反映させます。
