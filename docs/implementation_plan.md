# 実装計画：アーキテクチャ刷新と安定性向上

この計画は、シニアソフトウェアアーキテクトによるレビュー結果に基づき、プロジェクトの「保守性・拡張性・安定性」を向上させるための具体的な修正手順を定めたものです。

## 🎯 目的
1. **致命的バグの解消**: 未定義関数の使用によるクラッシュを防止する。
2. **ロジックの分離**: Context APIからビジネスロジックを抽出し、テスト可能で疎結合な構造にする。
3. **運用性の向上**: ロギングとエラーハンドリングを統一し、トラブルシューティングを容易にする。
4. **型安全性（擬似）の向上**: 定数管理によるマジックナンバーの排除。

## ⚠️ ユーザー確認事項
> [!IMPORTANT]
> - `CheckSessionContext` の内部構造を大幅に変更するため、現在ブラウザに保存されている「中断中のデータ」が一度リセットされる可能性があります。
> - 画面遷移のロジックを整理しますが、ユーザーインターフェース（見た目）への影響は最小限に留めます。

## 🛠 修正内容

---

### 1. 基礎基盤の整備（定数とドメインロジック）

マジックナンバーを排除し、状態遷移のルールを純粋関数として抽出します。

#### [NEW] [session.js](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/constants/session.js)
- セッションステータス（`IN_PROGRESS`, `COMPLETED`）の定義
- ストレージキーの集約

#### [NEW] [sessionLogic.js](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/domain/sessionLogic.js)
- `calculateProgress`: 進捗率の計算
- `isSessionComplete`: 完了判定ルール
- `getNextIndex`: インデックス遷移ロジック
- `createAnswerObject`: 回答オブジェクトの生成

---

### 2. コアロジックの修正（Context & Reducer）

発見されたバグを修正し、ドメインロジックを適用します。

#### [MODIFY] [CheckSessionContext.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/providers/CheckSessionContext.jsx)
- **バグ修正**: `useMemo` のインポート追加
- **リファクタリング**: 
    - `sessionReducer` を `sessionLogic` を使う形に簡素化。
    - 状態の二重管理（`session` と `resumeSession`）を整理し、単一の真実（Source of Truth）を構成。
- **堅牢化**: ストレージ保存時のエラーハンドリングを追加。

---

### 3. 安定性と運用性の向上（Logging & Error Handling）

#### [MODIFY] 各画面コンポーネント
- [App.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/App.jsx)
- [ChatCheck.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/ChatCheck.jsx)
- [ResultScreen.jsx](file:///c:/Users/t-matsuki/Desktop/CheckSheet/src/components/ResultScreen.jsx)
- `console.log` をすべて `logger` ユーティリティに置換。
- PDF出力やナビゲーション時の `try-catch` 徹底。

---

## 📅 実施スケジュール（フェーズ分け）

| フェーズ | 作業内容 | 期待される効果 |
| :--- | :--- | :--- |
| **Phase 1** | 定数とドメインロジックの抽出、バグ修正 | クラッシュの防止、コードの見通し改善 |
| **Phase 2** | Contextのリファクタリングとストレージ同期の強化 | データ整合性の向上、状態管理の簡素化 |
| **Phase 3** | 統合ロギングの適用とエラー通知の追加 | 現場でのトラブル追跡性の向上 |

---

## ✅ 検証計画

### 自動/手動テスト
1. **正常系**: 新規開始 -> 全項目回答 -> 自動完了 -> PDF出力がスムーズに行えるか。
2. **中断系**: 途中でホームに戻り、再度「続きから再開」してデータが保持されているか。
3. **異常系**: 意図的にエラーを発生させ（Storage不可など）、ErrorBoundaryや通知が正しく機能するか。
4. **ログ確認**: 開発者コンソールで `[INFO]`, `[DEBUG]` 等のタグが付いたログが適切に出力されているか。
