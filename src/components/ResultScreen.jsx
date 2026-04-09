import { useState, useRef, useCallback } from "react";
import { categories, TOTAL_ITEMS } from "../data/checkItems";
import { generatePDF } from "../utils/pdfGenerator";

/**
 * 結果確認画面コンポーネント
 * チェック結果の表示、PDF出力、アクションボタンを提供
 */
export default function ResultScreen({ session, onRestart, onGoHome }) {
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
        <div className="result-icon">✅</div>
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
            {cat.answers.map((item) => (
              <div key={item.id} className="result-item">
                <div
                  className={`result-item-icon ${
                    item.answer === "yes" ? "yes" : "no"
                  }`}
                >
                  {item.answer === "yes" ? "✓" : "✗"}
                </div>
                <div className="result-item-text">{item.question}</div>
              </div>
            ))}
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
            "📄 PDF出力"
          )}
        </button>
        <button
          className="btn btn-secondary btn-block"
          onClick={onRestart}
          id="btn-restart-check"
        >
          🔄 もう一度チェック
        </button>
        <button
          className="btn btn-ghost btn-block"
          onClick={onGoHome}
          id="btn-go-home"
        >
          🏠 ホームに戻る
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
