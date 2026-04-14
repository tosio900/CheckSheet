import React from "react";
import { getItemImageIds } from "../../domain/sessionLogic";

/**
 * PDF出力用のテンプレートコンポーネント (ページ分割対応)
 * 画像添付にも対応: 各項目の下に添付写真を表示する
 * 画像は行単位（3枚/行）で改ページ可能。質問+回答+1行目画像はアトミック。
 *
 * @param {object} session - セッションデータ
 * @param {Array} categorizedAnswers - カテゴリ別回答
 * @param {number} yesCount - はいの数
 * @param {number} noCount - いいえの数
 * @param {object} imageUrls - { [imageId]: dataURL } 事前にプリロードされた画像
 * @param {number} totalItems - 総項目数
 */
const PDFTemplate = React.forwardRef(({ session, categorizedAnswers, yesCount, noCount, imageUrls = {}, totalItems }, ref) => {
  // ウェイト設計: 1 weight ≒ 23.6px（実観測値: PAGE_LIMIT=55→DOM 1298px, 1298÷55=23.6）
  // A4有効高さ: scrollHeight ベース → 1244÷23.6 ≒ 52.7 weight が上限
  // 安全マージン込みで PAGE_LIMIT = 51
  const PAGE_LIMIT = 51;
  // 画像行ウェイト定数: 画像ボックス180px + padding上下(8+12)20px = 200px
  // 200px ÷ 23.6px/weight ≈ 8.47 → 安全マージン込みで 9.0 に設定
  const IMAGES_WEIGHT_PER_ROW = 9.0;
  // 1行あたりの最大画像枚数: 240px×3 + gap8px×2 = 736px（利用可能760px以内）
  const IMAGES_PER_ROW = 3;

  const pages = [];
  let currentPageNodes = [];
  let currentWeight = 0;

  // 改ページヘルパー
  const breakPage = () => {
    pages.push(currentPageNodes);
    currentPageNodes = [];
    currentWeight = 0;
  };

  const sessionImages = session.images || {};

  // 1. ヘッダー情報の生成とウェイト計算
  // メモの行数に応じて高さを動的に計算（1行あたり 0.8加算）
  const memoText = session.memo || "";
  const memoLines = memoText ? memoText.split("\n").length : 1;
  const headerBaseWeight = 10;
  const headerWeight = headerBaseWeight + (memoLines * 0.8);

  const headerNode = (
    <div key="header">
      <div style={{ textAlign: "center", borderBottom: "2px solid #333", paddingBottom: "10px", marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "24px" }}>測量前チェックシート</h1>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "8px", border: "1px solid #ccc", background: "#f9f9f9", width: "120px" }}>現場名</td>
              <td style={{ padding: "8px", border: "1px solid #ccc" }}>{session.siteName}</td>
            </tr>
            <tr>
              <td style={{ padding: "8px", border: "1px solid #ccc", background: "#f9f9f9" }}>点検者</td>
              <td style={{ padding: "8px", border: "1px solid #ccc" }}>{session.inspector}</td>
            </tr>
            <tr>
              <td style={{ padding: "8px", border: "1px solid #ccc", background: "#f9f9f9" }}>実施日時</td>
              <td style={{ padding: "8px", border: "1px solid #ccc" }}>
                {session.completedAt ? new Date(session.completedAt).toLocaleString("ja-JP") : "-"}
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
                    style={{ color: "#2563eb", textDecoration: "underline", display: "inline-block" }}
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

  currentPageNodes.push(headerNode);
  currentWeight += headerWeight;

  // 2. 質問項目のチャンク化
  categorizedAnswers.forEach((cat) => {
    // カテゴリヘッダー + 最初の項目のアンカーウェイト（質問+1行目画像）で改ページ判定
    const firstItem = cat.answers[0];
    const firstItemImageRows = firstItem
      ? Math.ceil(getItemImageIds(sessionImages, firstItem.id).length / IMAGES_PER_ROW)
      : 0;
    // アンカーウェイト = 質問+回答 + 1行目画像のみ（2行目以降は別途判定）
    const firstItemAnchorWeight = firstItem
      ? (firstItem.inputs ? 2.8 : 1.7) + (firstItemImageRows > 0 ? IMAGES_WEIGHT_PER_ROW : 0)
      : 1.7;
    const requiredWeightForHeader = 2.0 + firstItemAnchorWeight;

    if (currentWeight + requiredWeightForHeader > PAGE_LIMIT) {
      breakPage();
    }

    // カテゴリヘッダー
    currentPageNodes.push(
      <div key={`cat-${cat.id}`} style={{ background: "#333", color: "#fff", padding: "5px 10px", fontWeight: "bold", marginBottom: "10px" }}>
        {cat.name}
      </div>
    );
    currentWeight += 2.0;

    cat.answers.forEach((item) => {
      const itemImageIds = getItemImageIds(sessionImages, item.id);
      const imageRowCount = Math.ceil(itemImageIds.length / IMAGES_PER_ROW);
      const questionWeight = item.inputs ? 2.8 : 1.7;

      // ── アンカーウェイト（質問+回答+1行目画像）で改ページ判定 ──
      // 質問と最初の写真は必ず同じページに収める
      const firstRowWeight = imageRowCount > 0 ? IMAGES_WEIGHT_PER_ROW : 0;
      const anchorWeight = questionWeight + firstRowWeight;

      if (import.meta.env.DEV) {
        console.debug(
          `[PDF] ${cat.name} / "${item.question?.slice(0, 20)}" | anchorW=${anchorWeight.toFixed(1)} | cumulative=${(currentWeight + anchorWeight).toFixed(1)}/${PAGE_LIMIT}`
        );
      }

      if (currentWeight + anchorWeight > PAGE_LIMIT) {
        breakPage();
      }

      // ── 質問+回答ノードを追加 ──
      // 画像がある場合はボーダーを外し、直下の画像行が続くようにする
      const hasImages = itemImageIds.length > 0;
      currentPageNodes.push(
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
          <span style={{
            minWidth: "30px",
            fontWeight: "bold",
            color: item.answer === "yes" ? "#10b981" : "#ef4444",
          }}>
            {item.answer === "yes" ? "✓" : "✗"}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#000" }}>{item.question}</div>
            {item.inputs && (
              <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                → {Object.entries(item.inputs).map(([k, v]) => `${k}: ${v || '-'}`).join(' / ')}
              </div>
            )}
          </div>
        </div>
      );
      currentWeight += questionWeight;

      // ── 画像行ノードを1行ずつ追加（2行目以降は改ページ可能）──
      for (let rowIdx = 0; rowIdx < imageRowCount; rowIdx++) {
        const rowImageIds = itemImageIds.slice(rowIdx * IMAGES_PER_ROW, (rowIdx + 1) * IMAGES_PER_ROW);
        const isLastRow = rowIdx === imageRowCount - 1;

        // 2行目以降のみ改ページ判定（1行目はアンカーウェイトで保証済み）
        if (rowIdx > 0 && currentWeight + IMAGES_WEIGHT_PER_ROW > PAGE_LIMIT) {
          breakPage();
        }

        if (import.meta.env.DEV) {
          console.debug(
            `[PDF]   └ row ${rowIdx + 1}/${imageRowCount} (${rowImageIds.length}枚) | cumulative=${(currentWeight + IMAGES_WEIGHT_PER_ROW).toFixed(1)}/${PAGE_LIMIT}`
          );
        }

        currentPageNodes.push(
          <div
            key={`img-${item.id}-row${rowIdx}`}
            style={{
              padding: "8px 10px 12px 40px",
              borderBottom: isLastRow ? "1px solid #eee" : "none",
              display: "flex",
              flexWrap: "nowrap",  // 行内では折り返さない（行単位で管理）
              gap: "8px",
              background: "#fafafa",
            }}
          >
            {rowImageIds.map((imgId) => {
              const dataUrl = imageUrls[imgId];
              if (!dataUrl) return null;
              return (
                // html2canvas は objectFit をサポートしないため使用しない。
                // 固定 240×180 のwrapperDiv内に、width/height:auto の img を flex-center で配置する。
                // → 各画像が元のアスペクト比を保持しグレー余白でレターボックス表示される
                <div
                  key={imgId}
                  style={{
                    width: "240px",
                    height: "180px",
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
                  <img
                    src={dataUrl}
                    alt="添付写真"
                    style={{
                      maxWidth: "240px",
                      maxHeight: "180px",
                      width: "auto",
                      height: "auto",
                      display: "block",
                    }}
                  />
                </div>
              );
            })}
          </div>
        );
        currentWeight += IMAGES_WEIGHT_PER_ROW;
      }
    });
  });

  // 3. フッター
  if (currentWeight + 2 > PAGE_LIMIT) {
    breakPage();
  }
  currentPageNodes.push(
    <div key="footer" style={{ marginTop: "20px", textAlign: "right", fontSize: "10px", color: "#999" }}>
      Generated by SurveyCheck PWA - {new Date().toLocaleString()}
    </div>
  );
  pages.push(currentPageNodes);

  return (
    <div
      ref={ref}
      className="pdf-container"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        top: 0
      }}
    >
      {pages.map((pageNodes, idx) => (
        <div key={idx} className="pdf-page" style={{
          width: "880px",
          // minHeight は設定しない: scrollHeight で実コンテンツ高さのみキャンバス化するため
          // 最終ページで余分な空白が生まれないようにする
          backgroundColor: "#ffffff",
          padding: "40px",
          boxSizing: "border-box",
          color: "#000000",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}>
          {pageNodes}
        </div>
      ))}
    </div>
  );
});

PDFTemplate.displayName = "PDFTemplate";
export default PDFTemplate;
