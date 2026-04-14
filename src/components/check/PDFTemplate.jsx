import React from "react";
import { computePageLayout } from "../../utils/pdfLayout";
import { calcContainSize, IMAGE_BOX_W, IMAGE_BOX_H } from "../../utils/pdfConfig";

/**
 * PDF出力用テンプレートコンポーネント
 *
 * ページ分割ロジックは pdfLayout.computePageLayout() が担い、
 * このコンポーネントはブロックリストを JSX に変換するだけの
 * 純粋なプレゼンテーション層として機能する。
 *
 * 画像ハイブリッド埋め込み:
 *   - wrapperDiv に data-pdf-image, data-display-w, data-display-h を付与
 *   - pdfGenerator.js が html2canvas でテキストを取得した後、
 *     jsPDF.addImage() で画像を直接埋め込む（二重JPEG圧縮を回避）
 *
 * @param {object} session - セッションデータ
 * @param {Array} categorizedAnswers - カテゴリ別回答
 * @param {number} yesCount - はいの数
 * @param {number} noCount - いいえの数
 * @param {object} imageUrls - { [imageId]: dataURL } 事前にプリロードされた画像
 * @param {object} imageDimensions - { [imageId]: {w, h} } containスケーリング計算用
 * @param {number} totalItems - 総項目数
 */
const PDFTemplate = React.forwardRef(
  (
    {
      session,
      categorizedAnswers,
      yesCount,
      noCount,
      imageUrls = {},
      imageDimensions = {},
      totalItems,
    },
    ref
  ) => {
    // ページ分割はpdfLayout.jsの純粋関数が担う
    const pages = computePageLayout(session, categorizedAnswers);

    return (
      <div
        ref={ref}
        className="pdf-container"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", top: 0 }}
      >
        {pages.map((blocks, pageIdx) => (
          <div
            key={pageIdx}
            className="pdf-page"
            style={{
              width: "880px",
              // minHeight は設定しない: scrollHeight で実コンテンツ高さのみキャンバス化するため
              backgroundColor: "#ffffff",
              padding: "40px",
              boxSizing: "border-box",
              color: "#000000",
              fontFamily: "sans-serif",
              overflow: "hidden",
            }}
          >
            {blocks.map((block, blockIdx) =>
              renderBlock(block, blockIdx, session, yesCount, noCount, totalItems, imageUrls, imageDimensions)
            )}
          </div>
        ))}
      </div>
    );
  }
);

PDFTemplate.displayName = "PDFTemplate";
export default PDFTemplate;

// ─── ブロックレンダラー ────────────────────────────────────────────────

/**
 * ブロック種別に応じた JSX を返す
 */
function renderBlock(block, idx, session, yesCount, noCount, totalItems, imageUrls, imageDimensions) {
  switch (block.type) {
    case "page-header":
      return renderPageHeader(session, yesCount, noCount, totalItems);
    case "category":
      return renderCategoryHeader(block.cat);
    case "question":
      return renderQuestion(block.item, block.hasImages);
    case "image-row":
      return renderImageRow(block, idx, imageUrls, imageDimensions);
    case "footer":
      return renderFooter();
    default:
      return null;
  }
}

/** セッション情報ヘッダー */
function renderPageHeader(session, yesCount, noCount, totalItems) {
  const memoText = session.memo || "";
  return (
    <div key="header">
      <div
        style={{
          textAlign: "center",
          borderBottom: "2px solid #333",
          paddingBottom: "10px",
          marginBottom: "20px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px" }}>測量前チェックシート</h1>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "8px", border: "1px solid #ccc", background: "#f9f9f9", width: "120px" }}>
                現場名
              </td>
              <td style={{ padding: "8px", border: "1px solid #ccc" }}>{session.siteName}</td>
            </tr>
            <tr>
              <td style={{ padding: "8px", border: "1px solid #ccc", background: "#f9f9f9" }}>点検者</td>
              <td style={{ padding: "8px", border: "1px solid #ccc" }}>{session.inspector}</td>
            </tr>
            <tr>
              <td style={{ padding: "8px", border: "1px solid #ccc", background: "#f9f9f9" }}>実施日時</td>
              <td style={{ padding: "8px", border: "1px solid #ccc" }}>
                {session.completedAt
                  ? new Date(session.completedAt).toLocaleString("ja-JP")
                  : "-"}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px", border: "1px solid #ccc", background: "#f9f9f9" }}>結果</td>
              <td style={{ padding: "8px", border: "1px solid #ccc" }}>
                はい: {yesCount}件 / いいえ: {noCount}件 (全{totalItems}項目)
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px", border: "1px solid #ccc", background: "#f9f9f9" }}>位置情報</td>
              <td style={{ padding: "8px", border: "1px solid #ccc" }}>
                {session.gps ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${session.gps.lat},${session.gps.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pdf-link-target"
                    data-url={`https://www.google.com/maps/search/?api=1&query=${session.gps.lat},${session.gps.lng}`}
                    style={{
                      color: "#2563eb",
                      textDecoration: "underline",
                      display: "inline-block",
                    }}
                  >
                    北緯: {session.gps.lat.toFixed(6)} / 東経: {session.gps.lng.toFixed(6)}
                  </a>
                ) : (
                  "取得なし"
                )}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px", border: "1px solid #ccc", background: "#f9f9f9" }}>メモ</td>
              <td style={{ padding: "8px", border: "1px solid #ccc", whiteSpace: "pre-wrap" }}>
                {memoText || "なし"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** カテゴリヘッダー */
function renderCategoryHeader(cat) {
  return (
    <div
      key={`cat-${cat.id}`}
      style={{
        background: "#333",
        color: "#fff",
        padding: "5px 10px",
        fontWeight: "bold",
        marginBottom: "10px",
      }}
    >
      {cat.name}
    </div>
  );
}

/** 質問+回答ブロック */
function renderQuestion(item, hasImages) {
  return (
    <div
      key={`q-${item.id}`}
      style={{
        padding: "8px 10px",
        borderBottom: hasImages ? "none" : "1px solid #eee",
        display: "flex",
        alignItems: "flex-start",
        fontSize: "14px",
        background: "#fff",
      }}
    >
      <span
        style={{
          minWidth: "30px",
          fontWeight: "bold",
          color: item.answer === "yes" ? "#10b981" : "#ef4444",
        }}
      >
        {item.answer === "yes" ? "✓" : "✗"}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ color: "#000" }}>{item.question}</div>
        {item.inputs && (
          <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
            →{" "}
            {Object.entries(item.inputs)
              .map(([k, v]) => `${k}: ${v || "-"}`)
              .join(" / ")}
          </div>
        )}
      </div>
    </div>
  );
}

/** 画像行ブロック（ハイブリッド埋め込み用の data 属性付き） */
function renderImageRow(block, blockIdx, imageUrls, imageDimensions) {
  const { item, rowIdx, rowImageIds, isLastRow } = block;
  return (
    <div
      key={`img-${item.id}-row${rowIdx}-${blockIdx}`}
      style={{
        padding: "8px 10px 12px 40px",
        borderBottom: isLastRow ? "1px solid #eee" : "none",
        display: "flex",
        flexWrap: "nowrap",
        gap: "8px",
        background: "#fafafa",
      }}
    >
      {rowImageIds.map((imgId) => {
        const dataUrl = imageUrls[imgId];
        if (!dataUrl) return null;

        // contain スケーリング計算（pdfConfig のヘルパー関数を使用）
        const naturalSize = imageDimensions[imgId];
        const { displayW, displayH } = naturalSize
          ? calcContainSize(naturalSize.w, naturalSize.h)
          : { displayW: IMAGE_BOX_W, displayH: IMAGE_BOX_H };

        return (
          // data-pdf-image: pdfGenerator が画像を直接埋め込む位置を特定するためのキー
          // data-display-w/h: jsPDF.addImage() の描画サイズ計算に使用
          <div
            key={imgId}
            data-pdf-image={imgId}
            data-display-w={displayW}
            data-display-h={displayH}
            style={{
              width: `${IMAGE_BOX_W}px`,
              height: `${IMAGE_BOX_H}px`,
              background: "#f5f5f5",
              border: "1px solid #ddd",
              borderRadius: "4px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* この img は html2canvas で非表示にされ、jsPDF が直接埋め込む */}
            <img
              src={dataUrl}
              alt="添付写真"
              style={{
                width: displayW ? `${displayW}px` : "auto",
                height: displayH ? `${displayH}px` : "auto",
                maxWidth: `${IMAGE_BOX_W}px`,
                maxHeight: `${IMAGE_BOX_H}px`,
                display: "block",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** フッター */
function renderFooter() {
  return (
    <div
      key="footer"
      style={{ marginTop: "20px", textAlign: "right", fontSize: "10px", color: "#999" }}
    >
      Generated by SurveyCheck PWA - {new Date().toLocaleString()}
    </div>
  );
}
