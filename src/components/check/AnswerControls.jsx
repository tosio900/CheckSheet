import { CheckCircle, XCircle, ChevronLeft, Lightbulb } from "lucide-react";
import styles from "../ChatCheck.module.css";

export default function AnswerControls({ 
  currentIndex, 
  isInputIncomplete,
  requiresAnyInput = false,
  isPhotoMissing = false,
  onAnswer, 
  onBack, 
  onComplete, 
  showCompleteBtn 
}) {
  let validationMessage = "";
  if (isInputIncomplete) {
    if (requiresAnyInput && isPhotoMissing) {
      validationMessage = "写真の添付と入力項目のいずれか1つの入力が必要です";
    } else if (isPhotoMissing) {
      validationMessage = "写真を添付してください";
    } else if (requiresAnyInput) {
      validationMessage = "入力項目を1つ以上入力してください";
    }
  }

  return (
    <div className={`${styles["answer-area"]} ${styles["fixed-bottom"]}`}>
      {/* バリデーションメッセージ */}
      {isInputIncomplete && validationMessage && (
        <div className={styles["validation-message"]}>
          <Lightbulb size={12} className={styles["validation-icon"]} />
          {validationMessage}
        </div>
      )}
      
      <div className={styles["answer-buttons"]}>
        <button
          className={`${styles["answer-btn"]} ${styles["answer-btn-yes"]}`}
          onClick={() => onAnswer("yes")}
          disabled={isInputIncomplete}
        >
          <CheckCircle size={28} /> はい
        </button>
        <button
          className={`${styles["answer-btn"]} ${styles["answer-btn-no"]}`}
          onClick={() => onAnswer("no")}
        >
          <XCircle size={28} /> いいえ
        </button>
      </div>

      <div className={styles["back-button-container"]}>
        {currentIndex > 0 ? (
          <button
            className={`btn btn-ghost btn-sm ${styles["back-btn-with-icon"]}`}
            style={{ flex: 1 }}
            onClick={onBack}
          >
            <ChevronLeft size={16} /> 前の質問に戻る
          </button>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {showCompleteBtn && (
          <button
            className={`btn btn-primary btn-sm ${styles["back-btn-with-icon"]}`}
            style={{ flex: 1 }}
            onClick={onComplete}
          >
            結果画面に戻る <CheckCircle size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
