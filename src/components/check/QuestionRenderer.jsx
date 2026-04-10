/**
 * 質問の各回答タイプに応じた表示を担当するコンポーネント
 */
export default function QuestionRenderer({ item, currentInputs, onInputChange }) {
  // 特定の追加入力（点名など）がある場合
  if (item.inputs) {
    return (
      <div className="item-inputs-area" style={{ marginBottom: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {item.inputs.map((label, idx) => (
          <div key={idx} className="item-input-group">
            <label style={{ fontSize: "var(--font-size-xs)", fontWeight: "bold", color: "var(--color-text-secondary)", marginBottom: "4px", display: "block" }}>
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
