import { useState, useRef, useMemo } from "react";
import { useCheckSession } from "../hooks/useCheckSession";
import { useTemplates } from "../providers/TemplateContext";
import * as templateDb from "../utils/templateDb";
import { generatePDF } from "../utils/pdfGenerator";
import { getImage } from "../utils/imageDb";
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  RotateCcw, 
  Home, 
  BadgeCheck, 
  MapPin,
  ExternalLink
} from "lucide-react";
import PDFTemplate from "./check/PDFTemplate";
import logger from "../utils/logger";
import styles from "./ResultScreen.module.css";

/**
 * 結果確認画面コンポーネント
 */
export default function ResultScreen({ sessionOverride, onRestart, onGoHome, onEdit, onUpdateMemo, isReadOnly }) {
  const contextSession = useCheckSession();
  const { templates, activeTemplate } = useTemplates();
  const session = sessionOverride || contextSession.session;
  
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [imageUrls, setImageUrls] = useState({});
  const pdfRef = useRef(null);

  // 使用されたテンプレートを特定し、項目情報を解析
  const { displayTemplate, TOTAL_ITEMS } = useMemo(() => {
    if (!session || !templates.length) return { displayTemplate: null, TOTAL_ITEMS: 0 };
    
    const tId = session.templateId || "default";
    const found = templates.find(t => t.id === tId) || activeTemplate || templates[0];
    const info = templateDb.processTemplate(found);
    
    return {
      displayTemplate: found,
      TOTAL_ITEMS: info.totalCount
    };
  }, [session, templates, activeTemplate]);

  /**
   * 計算用状態（Override時は再計算する）
   */
  const answerMap = useMemo(() => {
    if (sessionOverride) {
      return new Map(session.answers.map(a => [a.itemId, a]));
    }
    return contextSession.answerMap;
  }, [sessionOverride, session.answers, contextSession.answerMap]);

  const yesCount = useMemo(() => {
    if (sessionOverride) return session.answers.filter(a => a.answer === "yes").length;
    return contextSession.yesCount;
  }, [sessionOverride, session.answers, contextSession.yesCount]);

  const noCount = useMemo(() => {
    if (sessionOverride) return session.answers.filter(a => a.answer === "no").length;
    return contextSession.noCount;
  }, [sessionOverride, session.answers, contextSession.noCount]);

  /**
   * カテゴリ別に回答をグループ化 (動的なテンプレート構造に基づく)
   */
  const categorizedAnswers = useMemo(() => {
    if (!displayTemplate) return [];
    return displayTemplate.categories.map((cat) => {
      const catAnswers = cat.items.map((item) => {
        const answer = answerMap.get(item.id);
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
  }, [displayTemplate, answerMap]);

  /**
   * PDF出力ハンドラ（画像プリロード付き）
   */
  const handlePdfExport = async () => {
    if (!pdfRef.current || isPdfGenerating) return;

    setIsPdfGenerating(true);
    setPdfError(null);
    try {
      // 1. 全画像をプリロードしてdataURLに変換
      const sessionImages = session.images || {};
      const allImageIds = Object.values(sessionImages).flat();
      const urls = {};

      for (const imgId of allImageIds) {
        try {
          const blob = await getImage(imgId);
          if (blob) {
            // BlobをdataURLに変換（html2canvasはObjectURLを正しくレンダリングできないため）
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            urls[imgId] = dataUrl;
          }
        } catch (err) {
          logger.warn("Failed to preload image for PDF", { imgId, err });
        }
      }

      // 2. 画像URLをstateに反映し、再レンダリングを待つ
      setImageUrls(urls);

      // 3. 次のtickでレンダリングされたテンプレートをPDF化
      await new Promise(resolve => setTimeout(resolve, 100));
      await generatePDF(pdfRef.current, session);
      logger.info("PDF export successful", { imageCount: allImageIds.length });
    } catch (error) {
      logger.error("PDF generation failed", error, { checkId: session.checkId });
      setPdfError("PDF出力に失敗しました。もう一度お試しください。");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className={styles["result-screen"]}>
      <div className={styles["result-header"]}>
        <div className={styles["result-icon"]}><BadgeCheck size={64} color="var(--color-primary)" /></div>
        <h1>{isReadOnly ? "過去のチェック記録" : "チェック完了！"}</h1>
        <p>{TOTAL_ITEMS}項目すべてのチェックが完了しました</p>
      </div>

      <div className={styles["result-info-card"]}>
        <div className={styles["result-info-row"]}>
          <span className={styles["result-info-label"]}>現場名</span>
          <span className={styles["result-info-value"]}>{session.siteName}</span>
        </div>
        <div className={styles["result-info-row"]}>
          <span className={styles["result-info-label"]}>点検者</span>
          <span className={styles["result-info-value"]}>{session.inspector}</span>
        </div>
        <div className={styles["result-info-row"]}>
          <span className={styles["result-info-label"]}>実施日時</span>
          <span className={styles["result-info-value"]}>
            {session.completedAt ? new Date(session.completedAt).toLocaleString("ja-JP") : "-"}
          </span>
        </div>
        <div className={styles["result-info-row"]}>
          <span className={styles["result-info-label"]}>位置情報</span>
          <span className={styles["result-info-value"]}>
            {session.gps ? (
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${session.gps.lat},${session.gps.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--color-primary)", textDecoration: "none" }}
              >
                <MapPin size={12} />
                北緯: {session.gps.lat.toFixed(6)} / 東経: {session.gps.lng.toFixed(6)}
                <ExternalLink size={12} />
              </a>
            ) : (
              "取得なし"
            )}
          </span>
        </div>
      </div>

      <div className={styles["result-memo-card"]}>
        <div className={styles["memo-label"]}>メモ・特記事項</div>
        <textarea
          className="form-input"
          value={session.memo || ""}
          onChange={(e) => !isReadOnly && onUpdateMemo(e.target.value)}
          placeholder={isReadOnly ? "メモはありません" : "ここから追記・修正できます"}
          rows={3}
          disabled={isReadOnly}
        />
      </div>

      <div className={styles["result-summary"]}>
        <div className={`${styles["summary-card"]} ${styles.yes}`}>
          <div className={styles["summary-count"]}>{yesCount}</div>
          <div className={styles["summary-label"]}>はい</div>
        </div>
        <div className={`${styles["summary-card"]} ${styles.no}`}>
          <div className={styles["summary-count"]}>{noCount}</div>
          <div className={styles["summary-label"]}>いいえ</div>
        </div>
      </div>

      <div className={styles["result-list"]}>
        {categorizedAnswers.map((cat) => (
          <div key={cat.id} className={styles["result-category"]}>
            <div className={styles["result-category-header"]}>{cat.name}</div>
            {!isReadOnly && <div className={styles["result-category-hint"]}>※項目をタップして修正</div>}
            {cat.answers.map((item) => {
              const editIndex = session.answers.findIndex(a => a.itemId === item.id);
              return (
              <div 
                key={item.id} 
                className={styles["result-item"]}
                onClick={() => !isReadOnly && editIndex >= 0 && onEdit(editIndex)}
                style={isReadOnly || editIndex < 0 ? { cursor: "default" } : undefined}
              >
                <div className={`${styles["result-item-icon"]} ${styles[item.answer] || ""}`}>
                  {item.answer === "yes" ? <CheckCircle size={18} />
                   : item.answer === "no" ? <XCircle size={18} />
                   : <span style={{ color: "var(--color-text-muted)", fontSize: "18px", fontWeight: "bold" }}>—</span>}
                </div>
                <div className={styles["result-item-text"]}>
                  <div>{item.question}</div>
                  {item.inputs && (
                    <div className={styles["result-item-inputs"]}>
                      {Object.entries(item.inputs).map(([k, v]) => `${k}: ${v || '未入力'}`).join(' / ')}
                    </div>
                  )}
                </div>
                {!isReadOnly && (
                  <div className={styles["result-item-edit-icon"]}>
                     {editIndex >= 0 && <RotateCcw size={14} style={{ opacity: 0.5 }} />}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className={styles["result-actions"]}>
        <button className="btn btn-primary btn-lg btn-block" onClick={handlePdfExport} disabled={isPdfGenerating}>
          {isPdfGenerating ? <span className="loading-spinner">PDF生成中...</span> : <><FileText size={20} /> PDF出力</>}
        </button>
        {pdfError && (
          <div className="pdf-error-message">
            {pdfError}
          </div>
        )}
        {!isReadOnly && <button className="btn btn-secondary btn-block" onClick={onRestart}><RotateCcw size={18} /> もう一度チェック</button>}
        <button className="btn btn-ghost btn-block" onClick={onGoHome}><Home size={18} /> {isReadOnly ? "履歴一覧に戻る" : "ホームに戻る"}</button>
      </div>

      {/* PDF用の隠しテンプレート */}
      <PDFTemplate 
        ref={pdfRef} 
        session={session} 
        categorizedAnswers={categorizedAnswers} 
        yesCount={yesCount} 
        noCount={noCount}
        imageUrls={imageUrls}
        totalItems={TOTAL_ITEMS}
      />
    </div>
  );
}
