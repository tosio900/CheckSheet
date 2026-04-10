import { Lightbulb } from "lucide-react";
import QuestionRenderer from "./QuestionRenderer";

export default function QuestionCard({ 
  currentItem, 
  currentIndex, 
  totalItems, 
  animKey, 
  currentInputs, 
  onInputChange 
}) {
  if (!currentItem) return null;

  return (
    <div className="question-card main-question focus-animation" key={animKey}>
      <div className="question-number">
        Q{currentIndex + 1} / {totalItems}
      </div>
      <h2 className="question-text">{currentItem.question}</h2>

      {/* 質問タイプに応じた追加入力エリア */}
      <QuestionRenderer 
        item={currentItem} 
        currentInputs={currentInputs} 
        onInputChange={onInputChange} 
      />

      {/* 備考（常時表示エリア） */}
      {currentItem.note && (
        <div className="note-card always-open">
          <div className="note-card-title">
            <Lightbulb size={18} color="#b45309" style={{ marginRight: 4 }} />
            補足と注意
          </div>
          <div className="note-card-content">
            {currentItem.note.split('\n').map((line, idx) => (
              <span key={idx}>
                {line}
                <br />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
