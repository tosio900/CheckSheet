import { useState } from "react";
import { loadHistory } from "../utils/storage";
import { ChevronLeft, Calendar, User, MapPin } from "lucide-react";

/**
 * 過去のチェックを閲覧するリスト画面
 */
export default function HistoryScreen({ onBack, onViewHistory }) {
  // コンポーネント初期化時に履歴をロード
  const [historyList] = useState(() => loadHistory());

  return (
    <div className="screen-container">
      <div className="header">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        <h1 className="header-title">過去の記録</h1>
        <div style={{ width: 24 }} /> {/* バランス用のスペーサー */}
      </div>

      <div className="content scrollable" style={{ padding: "16px" }}>
        {historyList.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "40px", color: "var(--color-text-secondary)" }}>
            <p>過去の記録はありません。</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {historyList.map((session) => (
              <div 
                key={session.checkId} 
                style={{
                  background: "var(--color-surface)",
                  borderRadius: "var(--radius-lg)",
                  padding: "16px",
                  boxShadow: "var(--shadow-sm)",
                  border: "1px solid var(--color-border-light)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onClick={() => onViewHistory(session)}
              >
                <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={16} color="var(--color-primary-dark)" />
                  {session.siteName}
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "var(--color-text-secondary)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Calendar size={14} />
                    {session.completedAt ? new Date(session.completedAt).toLocaleDateString("ja-JP") : "-"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <User size={14} />
                    {session.inspector}
                  </div>
                </div>
                
                <div style={{ marginTop: "12px", borderTop: "1px dashed var(--color-border-light)", paddingTop: "8px", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  回答済: {session.answers?.length || 0}項目
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
