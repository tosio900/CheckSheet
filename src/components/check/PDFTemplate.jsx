import React from "react";
import { TOTAL_ITEMS } from "../../data/checkItems";
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
 */
const PDFTemplate = React.forwardRef(({ session, categorizedAnswers, yesCount, noCount, imageUrls = {} }, ref) => {
  // 1ページあたりのウェイト上限目安（実測値に基づき、末尾の枠線切れを防ぐ微調整）
  const PAGE_LIMIT = 51; 
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
                はい: {yesCount}件 / いいえ: {noCount}件 (全{TOTAL_ITEMS}項目)
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
    const firstItem = cat.answers[0];
    const firstItemWeight = firstItem ? (firstItem.inputs ? 2.8 : 1.7) : 1.7;
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
      // 画像のウェイト計算: 3枚で1行、1行あたり約 7.5 ウェイト
      const itemImageIds = getItemImageIds(sessionImages, item.id);
      const imageRows = Math.ceil(itemImageIds.length / 3);
      const imagesWeight = imageRows * 7.5;

      // 項目ベースWeight: 入力あり=2.8, 入力なし=1.7
      let itemWeight = (item.inputs ? 2.8 : 1.7) + imagesWeight;

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
          minHeight: "1244px", // A4縦の比率を担保
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
