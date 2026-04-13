import { useState } from "react";
import { ClipboardList, AlertTriangle, PenTool, History } from "lucide-react";
import { TOTAL_ITEMS } from "../data/checkItems";
import ConfirmModal from "./common/ConfirmModal";
import styles from "./HomeScreen.module.css";

/**
 * ホーム画面コンポーネント
 * - 新規チェック開始
 * - 中断中セッションの再開/破棄
 * - 過去履歴の閲覧
 */
export default function HomeScreen({ onStartNew, onResume, resumeSession, onOpenHistory }) {
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  return (
    <div className={styles["home-screen"]}>
      {/* ロゴ */}
      <div className={styles["home-logo"]} aria-hidden="true">
        <ClipboardList size={48} strokeWidth={1.5} color="white" />
      </div>

      {/* タイトル */}
      <h1 className={styles["home-title"]}>測量前チェック</h1>
      <p className={styles["home-subtitle"]}>
        テンポ良く確実に現場チェック
      </p>

      {/* アクションボタン */}
      <div className={styles["home-actions"]}>
        {/* 中断中セッションがある場合 */}
        {resumeSession && (
          <div className={styles["home-resume-card"]}>
            <h3><AlertTriangle color="var(--color-warning)" size={16} /> 中断中のチェックがあります</h3>
            <p>
              現場名: {resumeSession.siteName}
              <br />
              進捗: {resumeSession.answers.length}/{TOTAL_ITEMS}項目
              <br />
              日付: {resumeSession.startedAt
                ? new Date(resumeSession.startedAt).toLocaleDateString("ja-JP")
                : "-"}
            </p>
            <div className={styles["home-resume-actions"]}>
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
          onClick={() => onStartNew(false)}
          id="btn-start-new"
        >
          <PenTool size={20} /> 新規チェック開始
        </button>
        
        {/* 過去履歴を閲覧ボタン */}
        <button
          className="btn btn-secondary btn-lg btn-block"
          style={{ marginTop: "12px", background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }}
          onClick={onOpenHistory}
        >
          <History size={20} /> 過去の履歴を見る
        </button>
      </div>

      {/* 破棄確認ダイアログ */}
      {showDiscardConfirm && (
        <ConfirmModal
          title="確認"
          message={
            <>
              中断中のチェックデータを破棄して、新しくチェックを開始しますか？
              <br />
              <strong>この操作は元に戻せません。</strong>
            </>
          }
          confirmLabel="破棄して開始"
          confirmVariant="danger"
          onConfirm={() => {
            setShowDiscardConfirm(false);
            onStartNew(true); // 強制的に新規開始（既存セッション破棄）
          }}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </div>
  );
}
