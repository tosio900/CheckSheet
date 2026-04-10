# タスクリスト：アーキテクチャ刷新と安定性向上

## Phase 1: 基礎基盤の整備（定数とドメインロジック）
- [x] `src/constants/session.js` の作成（ステータス定数など）
- [x] `src/domain/sessionLogic.js` の作成（判定・計算ロジック）
- [x] `src/providers/CheckSessionContext.jsx` の `useMemo` インポート修正（高優先度バグ）

## Phase 2: コアロジックの修正（Context & Reducer）
- [x] `sessionReducer` を `sessionLogic` を使用するようにリファクタリング
- [x] 状態構造の整理と副作用（永続化）の信頼性向上
- [x] `useCheckSession` フックへの影響確認と調整

## Phase 3: 安定性と運用性の向上（Logging & Error Handling）
- [x] `App.jsx` の `console.log` を `logger` へ変更
- [x] `ChatCheck.jsx` の `console.log` を `logger` へ変更
- [x] `ResultScreen.jsx` の `console.log` を `logger` へ変更
- [x] 非同期処理への `try-catch` 追加

## Phase 4: 検証と最終調整
- [ ] 全画面・全フローの手動テスト実行
- [ ] エラー境界の動作確認
- [ ] 最終的なコードクリーンアップ
