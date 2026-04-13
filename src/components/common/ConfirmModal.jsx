import { useEffect } from "react";

/**
 * 確認ダイアログの共通コンポーネント
 * @param {string} title - ダイアログタイトル
 * @param {ReactNode} message - メッセージ内容
 * @param {string} confirmLabel - 確認ボタンのラベル
 * @param {string} confirmVariant - 確認ボタンのバリアント ("danger" | "warning" | "primary")
 * @param {function} onConfirm - 確認時のコールバック
 * @param {function} onCancel - キャンセル時のコールバック
 */
export default function ConfirmModal({ 
  title, message, confirmLabel, confirmVariant = "danger", 
  onConfirm, onCancel 
}) {
  // Escapeキーでキャンセル
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  // danger の場合はオーバーレイクリックでの閉じを無効にする（誤タップ防止）
  const handleOverlayClick = confirmVariant === "danger" ? undefined : onCancel;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="modal-title" id="modal-title">{title}</h2>
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
