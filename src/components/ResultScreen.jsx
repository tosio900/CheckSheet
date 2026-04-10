import { useState, useRef, useMemo } from "react";
import { categories, TOTAL_ITEMS } from "../data/checkItems";
import { generatePDF } from "../utils/pdfGenerator";
import { useCheckSession } from "../hooks/useCheckSession";
import { CheckCircle, XCircle, FileText, RotateCcw, Home, BadgeCheck } from "lucide-react";
import PDFTemplate from "./check/PDFTemplate";
import logger from "../utils/logger";

/**
 * 結果確認画面コンポーネント
 */
export default function ResultScreen({ onRestart, onGoHome, onEdit, onUpdateMemo }) {
  const { session, yesCount, noCount } = useCheckSession();
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const pdfRef = useRef(null);

  /**
   * カテゴリ別に回答をグループ化
   */
  const categorizedAnswers = useMemo(() => {
    return categories.map((cat) => {
      const catAnswers = cat.items.map((item) => {
        const answer = session.answers.find((a) => a.itemId === item.id);
        return {
          ...item,
          answer: answer ? answer.answer : null,
          inputs: answer?.inputs || null
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
    try {
      // 日付フォーマット調整
      const dateStr = session.completedAt ? new Date(session.completedAt).toLocaleDateString("ja-JP").replace(/\//g, "") : "";
      const exportData = { ...session, date: dateStr };
      logger.info("PDF export started", { checkId: session.checkId });
      await generatePDF(pdfRef.current, exportData);
      logger.info("PDF export successful");
    } catch (error) {
      logger.error("PDF generation failed", error, { checkId: session.checkId });
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="result-screen">
      <div className="result-header">
        <div className="result-icon"><BadgeCheck size={64} color="var(--color-primary)" /></div>
        <h1>チェック完了！</h1>
        <p>{TOTAL_ITEMS}項目すべてのチェックが完了しました</p>
      </div>

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
          <span className="result-info-label">実施日時</span>
          <span className="result-info-value">
            {session.completedAt ? new Date(session.completedAt).toLocaleString("ja-JP") : "-"}
          </span>
        </div>
      </div>

      <div className="result-memo-card">
        <div className="memo-label">メモ・特記事項</div>
        <textarea
          className="form-input"
          value={session.memo || ""}
          onChange={(e) => onUpdateMemo(e.target.value)}
          placeholder="ここから追記・修正できます"
          rows={3}
        />
      </div>

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

      <div className="result-list">
        {categorizedAnswers.map((cat) => (
          <div key={cat.id} className="result-category">
            <div className="result-category-header">{cat.name}</div>
            <div className="result-category-hint">※項目をタップして修正</div>
            {cat.answers.map((item) => (
              <div 
                key={item.id} 
                className="result-item"
                onClick={() => onEdit(session.answers.findIndex(a => a.itemId === item.id))}
              >
                <div className={`result-item-icon ${item.answer}`}>
                  {item.answer === "yes" ? <CheckCircle size={18} /> : <XCircle size={18} />}
                </div>
                <div className="result-item-text">
                  <div>{item.question}</div>
                  {item.inputs && (
                    <div className="result-item-inputs">
                      {Object.entries(item.inputs).map(([k, v]) => `${k}: ${v || '未入力'}`).join(' / ')}
                    </div>
                  )}
                </div>
                <div className="result-item-edit-icon">
                   <RotateCcw size={14} style={{ opacity: 0.5 }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="result-actions">
        <button className="btn btn-primary btn-lg btn-block" onClick={handlePdfExport} disabled={isPdfGenerating}>
          {isPdfGenerating ? <span className="loading-spinner">PDF生成中...</span> : <><FileText size={20} /> PDF出力</>}
        </button>
        <button className="btn btn-secondary btn-block" onClick={onRestart}><RotateCcw size={18} /> もう一度チェック</button>
        <button className="btn btn-ghost btn-block" onClick={onGoHome}><Home size={18} /> ホームに戻る</button>
      </div>

      {/* PDF用の隠しテンプレート */}
      <PDFTemplate 
        ref={pdfRef} 
        session={session} 
        categorizedAnswers={categorizedAnswers} 
        yesCount={yesCount} 
        noCount={noCount} 
      />
    </div>
  );
}
