# スクロール問題 修正計画書

## 問題の概要

UI/UX改善実装中に発生した2件のスクロール障害と、狭い端末における写真編集画面のスクロール問題を修正する。

---

## 問題① 質問カードのスクロール不可

### 根本原因

```diff
/* ChatCheck.module.css */
.question-card {
  ...
-  overflow: hidden;  /* ← これが元凶。コンテンツを切り取って完全にスクロール不可にしている */
}
```

前回の UI/UX 改善で「スクロールバーを消す」目的で追加した `overflow: hidden` が、
実際には「コンテンツをクリップ（切り取り）」する動作をしていた。

**正しい設計**:
- `.check-content.fixed-layout` が `overflow-y: auto` でコンテンツ領域全体のスクロールを担当
- `.question-card` は `overflow` を指定しない（ `visible` デフォルト）が正しい
- スクロールバーが不要な場合は、コンテナ側で `scrollbar-width: thin` などで対応する

### 修正方針

`overflow: hidden` を `.question-card` から削除する。
「スクロールバーの視覚的ノイズ」については、`.check-content` のスクロールバーを細型化するスタイルで対応。

---

## 問題② iPhone SE等 狭い端末での写真編集画面スクロール不可

### 根本原因

```css
/* ImageAnnotator.module.css */
.annotator-overlay {
  touch-action: none; /* ← キャンバス以外の領域でも誤ってスクロールを封鎖 */
}
```

`touch-action: none` がオーバーレイ **全域** に適用されているため、
ヘッダーやツールバーでの縦スワイプが一切効かなくなっている。

**問題の連鎖:**
1. iPhone SE (375×667px) でオーバーレイを開く
2. ヘッダー＋キャンバス＋ツールバーが縦に並ぶ
3. ツールバーが画面外に押し出される（または圧縮される）
4. `touch-action: none` によってスクロールで確認できない
5. ボタンが見えない・押せない状態になる

### 修正方針

| 要素 | 現在の touch-action | 修正後 |
|------|-------------------|--------|
| `.annotator-overlay` | `none`（全域） | 削除（デフォルトに戻す） |
| `.annotator-canvas` | `none` | `none` のまま維持（描画用に必要） |
| `.annotator-canvas-container` | なし | `none` を追加（キャンバス描画領域のみ制限） |

**iPhone SE向け追加対策:**
- ツールバーボタンを横並びでコンパクトに維持
- `@media (max-height: 700px)` のブレークポイントを追加（現在は600pxのみ）
- ヘッダーのボタンサイズを `min-height: 40px` に抑える

---

## 修正対象ファイルと具体的な変更

### [MODIFY] ChatCheck.module.css

```diff
.question-card {
  background: var(--color-surface);
  border-radius: var(--radius-2xl);
  ...
-  overflow: hidden;
-  /* 不要な内部スクロールバーを排除 */
}

/* スクロールバーの視覚調整はコンテナ側で */
.check-content.fixed-layout {
  ...
  overflow-y: auto;
+  scrollbar-width: thin;
+  scrollbar-color: var(--color-border) transparent;
}
```

### [MODIFY] ImageAnnotator.module.css

```diff
.annotator-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
-  touch-action: none; /* ← 削除: オーバーレイ全域への適用が問題 */
+  overflow-y: auto;   /* ← 追加: 画面が小さい場合のスクロール許可 */
}

/* キャンバス描画コンテナのみ touch-action を制限 */
.annotator-canvas-container {
  flex: 1;
  ...
+  touch-action: none; /* ← ここに移動: 描画領域のみ制限 */
}

/* ブレークポイントを拡張 (600px → 700px) */
-@media (max-height: 600px) {
+@media (max-height: 700px) {
  ...
}
```

---

## 優先順位と影響範囲

| # | 修正内容 | 優先度 | リスク | 状態 |
|---|---------|--------|--------|------|
| 1 | `question-card` の `overflow: hidden` を削除 | **最高** | 低（1行削除のみ） | ✅ 完了 |
| 2 | `annotator-overlay` の `touch-action: none` を移動 | **高** | 中（描画動作に影響あり） | ✅ 完了 |
| 3 | `@media` ブレークポイントを 700px に拡張 | 中 | 低 | ✅ 完了 |

> [!NOTE]
> **ブラウザ検証結果（2026-04-14）**
> - Fix 1: 質問カードの4px細型スクロールバーが表示され、コンテンツスクロールが正常に動作することを確認
> - Fix 2: iPhone SE（375×667）エミュレーターでヘッダーとツールバーが両方表示され、スクロール操作が正常に動作することを確認

---

## 検証計画

### 問題① の確認方法
- 長い質問文（備考付き、写真添付あり）で質問カードが縦に長くなる状態を再現
- 質問カード内をスワイプしてスクロールできることを確認

### 問題② の確認方法
- Chrome DevTools で「iPhone SE」のデバイスエミュレーションを選択
- 写真を添付 → 注釈エディタを開く
- ヘッダーとツールバーが両方見えることを確認
- キャンバス上での描画が正常に行えることを確認
- ツールバーのボタン（保存・閉じる）がタップできることを確認
