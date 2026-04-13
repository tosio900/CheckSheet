import { Lightbulb } from "lucide-react";
import QuestionRenderer from "./QuestionRenderer";
import ImageAttachment from "./ImageAttachment";
import styles from "../ChatCheck.module.css";

export default function QuestionCard({ 
  currentItem, 
  currentIndex, 
  totalItems, 
  animKey, 
  currentInputs, 
  onInputChange,
  imageIds
}) {
  if (!currentItem) return null;

  return (
    <div className={`${styles["question-card"]} focus-animation`} key={animKey}>
      <div className={styles["question-number"]}>
        Q{currentIndex + 1} / {totalItems}
      </div>
      <h2 className={styles["question-text"]}>{currentItem.question}</h2>

      {/* 質問タイプに応じた追加入力エリア */}
      <QuestionRenderer 
        item={currentItem} 
        currentInputs={currentInputs} 
        onInputChange={onInputChange} 
      />

      {/* 画像添付エリア */}
      <ImageAttachment 
        itemId={currentItem.id}
        imageIds={imageIds}
      />

      {/* 備考（常時表示エリア） */}
      {currentItem.note && (
        <div className={styles["note-card"]}>
          <div className={styles["note-card-title"]}>
            <Lightbulb size={18} color="#b45309" style={{ marginRight: 4 }} />
            補足と注意
          </div>
          <div className={styles["note-card-content"]}>
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

