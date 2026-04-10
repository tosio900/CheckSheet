import { useRef, useEffect } from "react";
import { Check, X } from "lucide-react";

export default function MatrixView({ 
  allItems, 
  currentIndex, 
  answers, 
  onJumpTo 
}) {
  const matrixScrollRef = useRef(null);

  useEffect(() => {
    if (matrixScrollRef.current) {
      const activeElement = matrixScrollRef.current.querySelector(".active-col");
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [currentIndex]);

  return (
    <div className="answer-matrix-container">
        <div className="answer-matrix" ref={matrixScrollRef}>
            <table className="matrix-table">
                <thead>
                <tr>
                    {allItems.map((_, i) => (
                    <th key={i} className={currentIndex === i ? "active-col" : ""}>
                        {i + 1}
                    </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                <tr>
                    {allItems.map((item, i) => {
                    const ans = answers.find(a => a.itemId === item.id);
                    // 完了項目または現在の位置までアクセス可能
                    const canAccess = i <= answers.length && i < allItems.length;
                    return (
                        <td
                        key={i}
                        className={`${ans ? ans.answer : ""} ${canAccess ? "clickable" : ""} ${currentIndex === i ? "active-col" : ""}`}
                        onClick={() => canAccess && onJumpTo(i)}
                        >
                        {ans?.answer === "yes" ? <Check size={16} strokeWidth={4} /> : ans?.answer === "no" ? <X size={16} strokeWidth={4} /> : "-"}
                        </td>
                    );
                    })}
                </tr>
                </tbody>
            </table>
        </div>
        <div className="matrix-hint">※解答済みの番号をタップすると修正できます</div>
    </div>
  );
}
