import { TOTAL_ITEMS } from "../../data/checkItems";

export default function ProgressHeader({ currentItem, progress, percentage, onExit }) {
  return (
    <div className="check-header-container">
      <div className="check-header-top">
        <span className="check-header-title">測量前チェック</span>
        <button
          className="check-header-close"
          onClick={onExit}
          aria-label="中断して閉じる"
        >
          <span style={{ fontSize: '20px' }}>×</span>
        </button>
      </div>

      <div className="progress-container">
        <div className="progress-info">
          <span className="progress-category">
            {currentItem ? currentItem.categoryName : "完了確認"}
          </span>
          <span className="progress-count">
            {progress}/{TOTAL_ITEMS} ({percentage}%)
          </span>
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${percentage}%` }}
            role="progressbar"
          />
        </div>
      </div>
    </div>
  );
}
