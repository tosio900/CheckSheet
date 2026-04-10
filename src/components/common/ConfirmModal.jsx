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
