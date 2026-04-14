import { useState } from "react";
import { loadHistory } from "../utils/storage";
import { ChevronLeft, Calendar, User, MapPin, FileText } from "lucide-react";
import styles from "./HistoryScreen.module.css";

/**
 * 過去のチェックを閲覧するリスト画面
 */
export default function HistoryScreen({ onBack, onViewHistory }) {
  // コンポーネント初期化時に履歴をロード
  const [historyList] = useState(() => loadHistory());

  return (
    <div className={styles["history-screen"]}>
      <div className={styles["history-header"]}>
        <button className="back-btn" onClick={onBack} aria-label="戻る">
          <ChevronLeft size={24} />
        </button>
        <h1 className={styles["history-header-title"]}>過去の記録</h1>
        <div style={{ width: 40 }} /> {/* バランス用のスペーサー */}
      </div>

      <div className={styles["history-content"]}>
        {historyList.length === 0 ? (
          <div className={styles["history-empty"]}>
            <FileText size={40} strokeWidth={1.5} color="var(--color-text-muted)" />
            <p className={styles["history-empty-text"]}>過去の記録はありません</p>
            <p className={styles["history-empty-sub"]}>チェックを完了すると、ここに記録が表示されます</p>
          </div>
        ) : (
          <div className={styles["history-list"]}>
            {historyList.map((session) => (
              <div
                key={session.checkId}
                className={styles["history-card"]}
                onClick={() => onViewHistory(session)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onViewHistory(session)}
              >
                {/* 現場名（長くても1行で省略） */}
                <div className={styles["history-site"]}>
                  <MapPin size={15} className={styles["history-site-icon"]} />
                  <span className={styles["history-site-name"]}>{session.siteName}</span>
                </div>

                {/* 日付・担当者 */}
                <div className={styles["history-meta"]}>
                  <div className={styles["history-meta-item"]}>
                    <Calendar size={13} />
                    <span>
                      {session.completedAt
                        ? new Date(session.completedAt).toLocaleDateString("ja-JP")
                        : "-"}
                    </span>
                  </div>
                  <div className={styles["history-meta-item"]}>
                    <User size={13} />
                    <span className={styles["history-inspector"]}>{session.inspector}</span>
                  </div>
                </div>

                {/* 回答済み件数 */}
                <div className={styles["history-footer"]}>
                  <span className={styles["history-count"]}>
                    回答済: {session.answers?.length || 0}項目
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
