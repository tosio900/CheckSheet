import React from "react";
import { getItemImageIds } from "../../domain/sessionLogic";

/**
 * PDF出力用のテンプレートコンポーネント (ページ分割対応)
 * 画像添付にも対応: 各項目の下に添付写真を表示する
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
  // 画像行ウェイト定数: 170px(maxH150+padding上8+下12) ÷ 23.6px/weight ≈ 7.2
  // 安全マージン込みで 8.0 に設定（全体ウェイト係数と統一）
  const IMAGES_WEIGHT_PER_ROW = 8.0;
  const pages = [];
  let currentPageNodes = [];
  let currentWeight = 0;

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
    // 題目(2.0) + 最初の1問が入るスペースがあるか判定
    // ※ 最初の項目に画像がある場合も imagesWeight を含めて正確に判定する
    const firstItem = cat.answers[0];
    const firstItemImageRows = firstItem
      ? Math.ceil(getItemImageIds(sessionImages, firstItem.id).length / 3)
      : 0;
    const firstItemWeight = firstItem
      ? (firstItem.inputs ? 2.8 : 1.7) + firstItemImageRows * IMAGES_WEIGHT_PER_ROW
      : 1.7;
    const requiredWeightForHeader = 2.0 + firstItemWeight;

    if (currentWeight + requiredWeightForHeader > PAGE_LIMIT) {
      pages.push(currentPageNodes);
      currentPageNodes = [];
      currentWeight = 0;
    }

    // カテゴリヘッダー
    currentPageNodes.push(
      <div key={`cat-${cat.id}`} style={{ background: "#333", color: "#fff", padding: "5px 10px", fontWeight: "bold", marginBottom: "10px" }}>
        {cat.name}
      </div>
    );
    currentWeight += 2.0;

    cat.answers.forEach((item) => {
      // 画像行の実高さ: maxHeight(150px) + padding(上8px + 下12px) = 170px
      // IMAGES_WEIGHT_PER_ROW(8.0) = 170px ÷ 23.6px/weight ≈ 7.2 + 安全マージン
      // 1行あたり3枚: 幅(880-80-40)=760px, 1枚200px+gap8px → 3枚=616px
      const itemImageIds = getItemImageIds(sessionImages, item.id);
      const imageRows = Math.ceil(itemImageIds.length / 3);
      const imagesWeight = imageRows * IMAGES_WEIGHT_PER_ROW;

      // 項目ベースWeight: 入力あり=2.8, 入力なし=1.7
      let itemWeight = (item.inputs ? 2.8 : 1.7) + imagesWeight;

      // [DEBUG] 各項目の weight 累計をコンソールに出力（開発環境のみ）
      if (import.meta.env.DEV) {
        console.debug(
          `[PDF] ${cat.name} / "${item.question?.slice(0, 20)}" | weight=${itemWeight.toFixed(1)} | cumulative=${(currentWeight + itemWeight).toFixed(1)}/${PAGE_LIMIT}`
        );
      }

      if (currentWeight + itemWeight > PAGE_LIMIT) {
        pages.push(currentPageNodes);
        currentPageNodes = [];
        currentWeight = 0;
      }

      const hasImages = itemImageIds.length > 0;

      currentPageNodes.push(
        <div key={`item-${item.id}`}>
          <div style={{ padding: "8px 10px", borderBottom: hasImages ? "none" : "1px solid #eee", display: "flex", alignItems: "flex-start", fontSize: "14px", background: "#fff" }}>
            <span style={{
              minWidth: "30px",
              fontWeight: "bold",
              color: item.answer === "yes" ? "#10b981" : "#ef4444"
            }}>
              {item.answer === "yes" ? "✓" : "✗"}
            </span>
            <div style={{ flex: 1 }}>
              <div color="#000">{item.question}</div>
              {item.inputs && (
                <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                  → {Object.entries(item.inputs).map(([k, v]) => `${k}: ${v || '-'}`).join(' / ')}
                </div>
              )}
            </div>
          </div>
          {/* 添付画像エリア */}
          {hasImages && (
            <div style={{ 
              padding: "8px 10px 12px 40px", 
              borderBottom: "1px solid #eee",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              background: "#fafafa"
            }}>
              {itemImageIds.map((imgId) => {
                const dataUrl = imageUrls[imgId];
                if (!dataUrl) return null;
                return (
                  <img
                    key={imgId}
                    src={dataUrl}
                    alt="添付写真"
                    style={{
                      width: "200px",
                      height: "auto",
                      maxHeight: "150px", // 画像最大高さ
                      objectFit: "contain",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      );
      currentWeight += itemWeight;
    });
  });

  // 3. フッター
  if (currentWeight + 2 > PAGE_LIMIT) {
    pages.push(currentPageNodes);
    currentPageNodes = [];
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
          overflow: "hidden"
        }}>
          {pageNodes}
        </div>
      ))}
    </div>
  );
});

PDFTemplate.displayName = "PDFTemplate";
export default PDFTemplate;
