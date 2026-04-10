import { TOTAL_ITEMS } from "../../data/checkItems";
import styles from "../ChatCheck.module.css";

export default function ProgressHeader({ currentItem, progress, percentage, onExit }) {
  return (
    <div className={`${styles["check-header"]} ${styles["fixed-header"]}`}>
      <div className={styles["check-header-top"]}>
        <span className={styles["check-header-title"]}>測量前チェック</span>
        <button
          className={styles["check-header-close"]}
          onClick={onExit}
          aria-label="中断して閉じる"
        >
          <span style={{ fontSize: '20px' }}>×</span>
        </button>
      </div>

      <div className={styles["progress-container"]}>
        <div className={styles["progress-info"]}>
          <span className={styles["progress-category"]}>
            {currentItem ? currentItem.categoryName : "完了確認"}
          </span>
          <span className={styles["progress-count"]}>
            {progress}/{TOTAL_ITEMS} ({percentage}%)
          </span>
        </div>
        <div className={styles["progress-bar-track"]}>
          <div
            className={styles["progress-bar-fill"]}
            style={{ width: `${percentage}%` }}
            role="progressbar"
          />
        </div>
      </div>
    </div>
  );
}
