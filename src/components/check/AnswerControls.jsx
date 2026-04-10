import { CheckCircle, XCircle, ChevronLeft, Lightbulb } from "lucide-react";

export default function AnswerControls({ 
  currentIndex, 
  isInputIncomplete, 
  onAnswer, 
  onBack, 
  onComplete, 
  showCompleteBtn 
}) {
  return (
    <div className="answer-area fixed-bottom">
      {/* バリデーションメッセージ */}
      {isInputIncomplete && (
        <div className="validation-message" style={{ color: "var(--color-danger)", fontSize: "var(--font-size-xs)", fontWeight: "bold", textAlign: "center", marginBottom: "var(--space-2)", animation: "fadeIn 0.2s ease" }}>
          <Lightbulb size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          上の点名を入力すると「はい」が押せます
        </div>
      )}
      
      <div className="answer-buttons">
        <button
          className={`answer-btn answer-btn-yes ${isInputIncomplete ? "disabled" : ""}`}
          onClick={() => !isInputIncomplete && onAnswer("yes")}
          disabled={isInputIncomplete}
          style={isInputIncomplete ? { opacity: 0.5, filter: "grayscale(1)", cursor: "not-allowed" } : {}}
        >
          <CheckCircle size={28} /> はい
        </button>
        <button
          className="answer-btn answer-btn-no"
          onClick={() => onAnswer("no")}
        >
          <XCircle size={28} /> いいえ
        </button>
      </div>

      <div className="back-button-container" style={{ gap: "8px" }}>
        {currentIndex > 0 ? (
          <button
            className="btn btn-ghost btn-sm back-btn-with-icon"
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
            className="btn btn-primary btn-sm back-btn-with-icon"
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
