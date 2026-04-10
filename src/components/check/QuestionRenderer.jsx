import styles from "../ChatCheck.module.css";

/**
 * 質問の各回答タイプに応じた表示を担当するコンポーネント
 */
export default function QuestionRenderer({ item, currentInputs, onInputChange }) {
  // 特定の追加入力（点名など）がある場合
  if (item.inputs) {
    return (
      <div className={styles["item-inputs-area"]}>
        {item.inputs.map((label, idx) => (
          <div key={idx} className={styles["item-input-group"]}>
            <label>
              {label}
            </label>
            <input
              type="text"
              className="form-input"
              placeholder={`${label}を入力`}
              value={currentInputs[label] || ""}
              onChange={(e) => onInputChange(label, e.target.value)}
              style={{ padding: "10px", fontSize: "var(--font-size-sm)" }}
            />
          </div>
        ))}
      </div>
    );
  }

  // デフォルト（通常の「はい/いいえ」のみ）
  return null;
}
