import { useRef, useEffect } from "react";
import { Check, X } from "lucide-react";
import styles from "./MatrixView.module.css";

export default function MatrixView({ 
  allItems, 
  currentIndex, 
  answerMap, 
  onJumpTo 
}) {
  const matrixScrollRef = useRef(null);

  useEffect(() => {
    if (matrixScrollRef.current) {
      const activeElement = matrixScrollRef.current.querySelector(`.${styles["active-col"]}`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [currentIndex]);

  return (
    <div className="answer-matrix-container">
        <div className={styles["answer-matrix"]} ref={matrixScrollRef}>
            <table className={styles["matrix-table"]}>
                <thead>
                <tr>
                    {allItems.map((_, i) => (
                    <th key={i} className={currentIndex === i ? styles["active-col"] : ""}>
                        {i + 1}
                    </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                <tr>
                    {allItems.map((item, i) => {
                    const ans = answerMap.get(item.id);
                    // 回答済みか、現在位置以前ならアクセス可能
                    const canAccess = answerMap.has(item.id) || i <= currentIndex;
                    return (
                        <td
                        key={i}
                        className={`${ans ? styles[ans.answer] || "" : ""} ${canAccess ? styles["clickable"] : ""} ${currentIndex === i ? styles["active-col"] : ""}`}
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
        <div className={styles["matrix-hint"]}>※回答済みの番号をタップすると修正できます</div>
    </div>
  );
}
