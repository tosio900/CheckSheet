import { useState, useRef } from "react";
import { useCheckSession } from "../hooks/useCheckSession";
import { useTemplates } from "../providers/TemplateContext";
import { processTemplate } from "../utils/templateDb";
import { usePdfExport } from "../hooks/usePdfExport";
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
import styles from "./ResultScreen.module.css";

/**
 * 結果確認画面コンポーネント
 */
export default function ResultScreen({ sessionOverride, onRestart, onGoHome, onEdit, onUpdateMemo, isReadOnly }) {
  const contextSession = useCheckSession();
  const { templates, activeTemplate } = useTemplates();
  const session = sessionOverride || contextSession.session;

  const pdfRef = useRef(null);

  // PDF出力ロジック（画像プリロード・生成）はカスタムフックに委譲
  const { isPdfGenerating, pdfError, imageUrls, imageDimensions, exportPdf } = usePdfExport(session);

  const [filter, setFilter] = useState("all"); // 'all' | 'yes' | 'no'

  // ── データ集計・パース ───────────────────────────────────────
  // React Compiler が有効なため、手動の useMemo は削除して自動最適化に任せる
  
  // 1. 使用されたテンプレートを特定し、項目情報を解析
  let displayTemplate = null;
  let TOTAL_ITEMS = 0;
  if (session && templates.length) {
    const tId = session.templateId || "default";
    displayTemplate = templates.find(t => t.id === tId) || activeTemplate || templates[0];
    const info = processTemplate(displayTemplate);
    TOTAL_ITEMS = info.totalCount;
  }

  // 2. 回答マップの作成
  const answerMap = new Map((session?.answers || []).map(a => [a.itemId, a]));

  // 3. 集計値の計算
  const yesCount = (session?.answers || []).filter(a => a.answer === "yes").length;
  const noCount = (session?.answers || []).filter(a => a.answer === "no").length;

  // 4. カテゴリ別に回答をグループ化
  const categorizedAnswers = displayTemplate ? displayTemplate.categories.map((cat) => {
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
  }) : [];

  // 5. フィルター適用後の回答リスト
  const filteredCategorizedAnswers = filter === "all" 
    ? categorizedAnswers 
    : categorizedAnswers
      .map(cat => ({
        ...cat,
        answers: cat.answers.filter(a => a.answer === filter)
      }))
      .filter(cat => cat.answers.length > 0);

  /**
   * PDF出力ハンドラ
   */
  const handlePdfExport = () => exportPdf(pdfRef);

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
          <span className={styles["result-info-value"]}>{session?.siteName || "-"}</span>
        </div>
        <div className={styles["result-info-row"]}>
          <span className={styles["result-info-label"]}>点検者</span>
          <span className={styles["result-info-value"]}>{session?.inspector || "-"}</span>
        </div>
        <div className={styles["result-info-row"]}>
          <span className={styles["result-info-label"]}>実施日時</span>
          <span className={styles["result-info-value"]}>
            {session?.completedAt ? new Date(session.completedAt).toLocaleString("ja-JP") : "-"}
          </span>
        </div>
        <div className={styles["result-info-row"]}>
          <span className={styles["result-info-label"]}>位置情報</span>
          <span className={styles["result-info-value"]}>
            {session?.gps ? (
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
          value={session?.memo || ""}
          onChange={(e) => !isReadOnly && onUpdateMemo(e.target.value)}
          placeholder={isReadOnly ? "メモはありません" : "ここから追記・修正できます"}
          rows={3}
          disabled={isReadOnly}
        />
      </div>

      <div className={styles["result-summary"]}>
        <div
          className={`${styles["summary-card"]} ${styles.yes} ${filter === 'yes' ? styles.active : ''}`}
          onClick={() => setFilter(filter === 'yes' ? 'all' : 'yes')}
          role="button"
          aria-pressed={filter === 'yes'}
        >
          <div className={styles["summary-count"]}>{yesCount}</div>
          <div className={styles["summary-label"]}>はい</div>
        </div>
        <div
          className={`${styles["summary-card"]} ${styles.no} ${filter === 'no' ? styles.active : ''}`}
          onClick={() => setFilter(filter === 'no' ? 'all' : 'no')}
          role="button"
          aria-pressed={filter === 'no'}
        >
          <div className={styles["summary-count"]}>{noCount}</div>
          <div className={styles["summary-label"]}>いいえ</div>
        </div>
      </div>

      <div className={styles["result-list-header"]}>
        <span className={styles["list-title"]}>
          {filter === 'all' ? 'すべての回答' : filter === 'yes' ? '「はい」の回答' : '「いいえ」の回答'}
        </span>
        {filter !== 'all' && (
          <button className={styles["filter-reset"]} onClick={() => setFilter('all')}>
            すべて表示
          </button>
        )}
      </div>

      <div className={styles["result-list"]}>
        {filteredCategorizedAnswers.length > 0 ? filteredCategorizedAnswers.map((cat) => (
          <div key={cat.id} className={styles["result-category"]}>
            <div className={styles["result-category-header"]}>{cat.name}</div>
            {!isReadOnly && filter === 'all' && <div className={styles["result-category-hint"]}>※項目をタップして修正</div>}
            {cat.answers.map((item) => {
              const editIndex = session?.answers ? session.answers.findIndex(a => a.itemId === item.id) : -1;
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
        )) : (
          <div className={styles["result-empty"]}>
            該当する項目はありません
          </div>
        )}
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
      {session && (
        <PDFTemplate
          ref={pdfRef}
          session={session}
          categorizedAnswers={categorizedAnswers}
          yesCount={yesCount}
          noCount={noCount}
          imageUrls={imageUrls}
          imageDimensions={imageDimensions}
          totalItems={TOTAL_ITEMS}
        />
      )}
    </div>
  );
}
