import { useState, useRef, useCallback } from "react";
import { categories, TOTAL_ITEMS } from "../data/checkItems";
import { generatePDF } from "../utils/pdfGenerator";
import { CheckCircle, XCircle, FileText, RotateCcw, Home, BadgeCheck } from "lucide-react";

/**
 * 結果確認画面コンポーネント
 * チェック結果の表示、PDF出力、アクションボタンを提供
 */
export default function ResultScreen({ session, onRestart, onGoHome, onEdit, onUpdateMemo }) {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const pdfRef = useRef(null);

  /** 回答を集計 */
  const yesCount = session.answers.filter((a) => a.answer === "yes").length;
  const noCount = session.answers.filter((a) => a.answer === "no").length;

  /**
   * カテゴリ別に回答をグループ化
   */
  const getAnswersByCategory = useCallback(() => {
    return categories.map((cat) => {
      const catAnswers = cat.items.map((item) => {
        const answer = session.answers.find((a) => a.itemId === item.id);
        return {
          ...item,
          answer: answer ? answer.answer : null,
        };
      });
      return {
        ...cat,
        answers: catAnswers,
      };
    });
  }, [session.answers]);

  /**
   * PDF出力ハンドラ
   */
  const handlePdfExport = async () => {
    if (!pdfRef.current || isPdfGenerating) return;

    setIsPdfGenerating(true);
    console.log("[ResultScreen] PDF生成開始...");

    try {
      await generatePDF(pdfRef.current, session);
      console.log("[ResultScreen] PDF生成成功");
    } catch (error) {
      console.error("[ResultScreen] PDF生成失敗:", error);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const categorizedAnswers = getAnswersByCategory();

  return (
    <div className="result-screen">
      {/* ヘッダー */}
      <div className="result-header">
        <div className="result-icon"><BadgeCheck size={64} color="var(--color-primary)" /></div>
        <h1>チェック完了！</h1>
        <p>{TOTAL_ITEMS}項目すべてのチェックが完了しました</p>
      </div>

      {/* 基本情報カード */}
      <div className="result-info-card">
        <div className="result-info-row">
          <span className="result-info-label">現場名</span>
          <span className="result-info-value">{session.siteName}</span>
        </div>
        <div className="result-info-row">
          <span className="result-info-label">点検者</span>
          <span className="result-info-value">{session.inspector}</span>
        </div>
        <div className="result-info-row">
          <span className="result-info-label">日付</span>
          <span className="result-info-value">{session.date}</span>
        </div>
        <div className="result-info-row">
          <span className="result-info-label">完了時刻</span>
          <span className="result-info-value">
            {session.completedAt
              ? new Date(session.completedAt).toLocaleTimeString("ja-JP")
              : "-"}
          </span>
        </div>
      </div>

      {/* メモ編集エリア */}
      <div className="result-memo-card" style={{ background: "var(--color-surface)", padding: "var(--space-4)", borderRadius: "var(--radius-xl)", border: "1px solid var(--color-border-light)", marginBottom: "var(--space-4)" }}>
        <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", fontWeight: "bold", marginBottom: "var(--space-2)" }}>メモ・特記事項</div>
        <textarea
          className="form-input"
          value={session.memo || ""}
          onChange={(e) => onUpdateMemo && onUpdateMemo(e.target.value)}
          placeholder="ここから追記・修正できます"
          rows={3}
          style={{ resize: "vertical", width: "100%", background: "var(--color-bg)" }}
        />
      </div>

      {/* サマリー */}
      <div className="result-summary">
        <div className="summary-card yes">
          <div className="summary-count">{yesCount}</div>
          <div className="summary-label">はい</div>
        </div>
        <div className="summary-card no">
          <div className="summary-count">{noCount}</div>
          <div className="summary-label">いいえ</div>
        </div>
      </div>

      {/* カテゴリ別結果一覧 */}
      <div className="result-list">
        {categorizedAnswers.map((cat) => (
          <div key={cat.id} className="result-category">
            <div className="result-category-header">{cat.name}</div>
            <div className="result-category-hint" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "8px", textAlign: "right" }}>※項目をタップして修正</div>
            {cat.answers.map((item) => {
              const globalIndex = session.answers.findIndex(a => a.itemId === item.id);
              return (
                <div 
                  key={item.id} 
                  className="result-item"
                  onClick={() => globalIndex >= 0 && onEdit && onEdit(globalIndex)}
                  style={{ cursor: "pointer" }}
                  title="タップして回答を修正"
                >
                  <div
                    className={`result-item-icon ${
                      item.answer === "yes" ? "yes" : "no"
                    }`}
                  >
                    {item.answer === "yes" ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  </div>
                  <div className="result-item-text">
                    <div>{item.question}</div>
                    {session.answers.find(a => a.itemId === item.id)?.inputs && (
                      <div style={{ fontSize: "0.75rem", color: "var(--color-primary-dark)", marginTop: "4px", background: "var(--color-primary-light)", padding: "2px 6px", borderRadius: "4px", display: "inline-block" }}>
                        {Object.entries(session.answers.find(a => a.itemId === item.id).inputs).map(([k, v]) => `${k}: ${v || '未入力'}`).join(' / ')}
                      </div>
                    )}
                  </div>
                  <div style={{ color: "var(--color-primary)", marginLeft: "auto", display: "flex", alignItems: "center", justifySelf: "flex-end" }}>
                     <RotateCcw size={14} style={{ opacity: 0.5 }} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* アクションボタン */}
      <div className="result-actions">
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={handlePdfExport}
          disabled={isPdfGenerating}
          id="btn-export-pdf"
        >
          {isPdfGenerating ? (
            <span className="loading-spinner">PDF生成中...</span>
          ) : (
            <><FileText size={20} style={{ marginRight: 8 }} /> PDF出力</>
          )}
        </button>
        <button
          className="btn btn-secondary btn-block"
          onClick={onRestart}
          id="btn-restart-check"
          style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
        >
          <RotateCcw size={18} /> もう一度チェック
        </button>
        <button
          className="btn btn-ghost btn-block"
          onClick={onGoHome}
          id="btn-go-home"
          style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
        >
          <Home size={18} /> ホームに戻る
        </button>
      </div>

      {/* ==============================
          PDF出力用の隠しHTML（画面外でレンダリング）
          ============================== */}
      <div
        ref={pdfRef}
        className="pdf-container"
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "600px",
        }}
      >
        <div className="pdf-header">
          <h1>測量前チェックシート</h1>
        </div>

        <div className="pdf-info">
          <table>
            <tbody>
              <tr>
                <td>現場名</td>
                <td>{session.siteName}</td>
              </tr>
              <tr>
                <td>点検者</td>
                <td>{session.inspector}</td>
              </tr>
              <tr>
                <td>日付</td>
                <td>{session.date}</td>
              </tr>
              <tr>
                <td>結果</td>
                <td>
                  はい: {yesCount}件 / いいえ: {noCount}件
                </td>
              </tr>
              <tr>
                <td>メモ</td>
                <td style={{ whiteSpace: "pre-wrap" }}>{session.memo || "なし"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {categorizedAnswers.map((cat) => (
          <div key={cat.id}>
            <div className="pdf-category-title">{cat.name}</div>
            {cat.answers.map((item) => (
              <div key={item.id} className="pdf-item">
                <span
                  className={`pdf-item-icon ${
                    item.answer === "yes" ? "yes" : "no"
                  }`}
                >
                  {item.answer === "yes" ? "✓" : "✗"}
                </span>
                <span>{item.question}</span>
                {session.answers.find(a => a.itemId === item.id)?.inputs && (
                  <div style={{ fontSize: "10px", color: "#059669", marginLeft: "24px" }}>
                    → {Object.entries(session.answers.find(a => a.itemId === item.id).inputs).map(([k, v]) => `${k}: ${v || '-'}`).join(' / ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        <div className="pdf-footer">
          出力日時: {new Date().toLocaleString("ja-JP")}
        </div>
      </div>
    </div>
  );
}
