import { useState } from "react";
import { ClipboardList, AlertTriangle, PenTool } from "lucide-react";

/**
 * ホーム画面コンポーネント
 * - 新規チェック開始
 * - 中断中セッションの再開/破棄
 */
export default function HomeScreen({ onStartNew, onResume, resumeSession }) {
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  return (
    <div className="home-screen">
      {/* ロゴ */}
      <div className="home-logo" aria-hidden="true">
        <ClipboardList size={48} strokeWidth={1.5} color="white" />
      </div>

      {/* タイトル */}
      <h1 className="home-title">測量前チェック</h1>
      <p className="home-subtitle">
        テンポ良く確実に現場チェック
      </p>

      {/* アクションボタン */}
      <div className="home-actions">
        {/* 中断中セッションがある場合 */}
        {resumeSession && (
          <div className="home-resume-card">
            <h3><AlertTriangle color="var(--color-warning)" size={16} /> 中断中のチェックがあります</h3>
            <p>
              現場名: {resumeSession.siteName}
              <br />
              進捗: {resumeSession.answers.length}/43項目
              <br />
              日付: {resumeSession.date}
            </p>
            <div className="home-resume-actions">
              <button
                className="btn btn-warning btn-sm"
                onClick={onResume}
                id="btn-resume"
              >
                続きから再開
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowDiscardConfirm(true)}
                id="btn-discard"
              >
                破棄する
              </button>
            </div>
          </div>
        )}

        {/* 新規チェック開始ボタン */}
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={onStartNew}
          id="btn-start-new"
        >
          <PenTool size={20} /> 新規チェック開始
        </button>
      </div>

      {/* 破棄確認ダイアログ */}
      {showDiscardConfirm && (
        <div className="modal-overlay" onClick={() => setShowDiscardConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">確認</h2>
            <p className="modal-message">
              中断中のチェックデータを破棄して、新しくチェックを開始しますか？
              <br />
              <strong>この操作は元に戻せません。</strong>
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowDiscardConfirm(false)}
              >
                キャンセル
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onStartNew(true); // 強制的に新規開始（既存セッション破棄）
                }}
              >
                破棄して開始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
