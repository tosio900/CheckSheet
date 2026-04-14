/**
 * PDF生成ユーティリティ（ハイブリッド方式）
 *
 * 生成の流れ:
 *   1. html2canvas でページを JPEG キャプチャ（画像は非表示にする）
 *   2. jsPDF でキャプチャ画像を配置
 *   3. [data-pdf-image] 要素の DOM 座標を取得し、jsPDF.addImage() で画像を直接埋め込む
 *
 * メリット:
 *   - 画像が二重 JPEG 圧縮されない（元の dataUrl をそのまま使用）
 *   - html2canvas の scale を 2.0 に抑えられる（テキストのみキャプチャ）
 *   - objectFit の非対応問題が根本的に解決される
 */

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { sanitizeFileName } from "./sanitize";
import logger from "./logger";

/** A4 ページ幅 (mm) */
const A4_WIDTH_MM = 210;

/** A4 ページ高さ (mm) */
const A4_HEIGHT_MM = 297;

/**
 * DOM 上のボックスを PDF の mm 座標に変換するヘルパー
 *
 * @param {DOMRect} targetRect - 変換したい要素の BoundingClientRect
 * @param {DOMRect} pageRect   - ページ要素の BoundingClientRect
 * @param {number} pixelToMm  - ピクセル → mm 変換係数
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
function domRectToPdfCoords(targetRect, pageRect, pixelToMm) {
  return {
    x: (targetRect.left - pageRect.left) * pixelToMm,
    y: (targetRect.top - pageRect.top) * pixelToMm,
    w: targetRect.width * pixelToMm,
    h: targetRect.height * pixelToMm,
  };
}

/**
 * HTML要素をハイブリッド方式でPDFとして出力する
 *
 * @param {HTMLElement} element   - .pdf-container 要素（PDFTemplate のルート）
 * @param {object} sessionData    - セッションデータ（ファイル名生成用）
 * @param {object} imageUrls      - { [imgId]: dataUrl } 事前プリロード済みの画像
 */
export async function generatePDF(element, sessionData, imageUrls = {}) {
  try {
    logger.info("PDF生成開始", { siteName: sessionData.siteName });

    // ── ファイル名生成 ──────────────────────────────────────────
    const targetDate = sessionData.completedAt
      ? new Date(sessionData.completedAt)
      : new Date();
    const dateStr =
      targetDate.getFullYear().toString() +
      (targetDate.getMonth() + 1).toString().padStart(2, "0") +
      targetDate.getDate().toString().padStart(2, "0") +
      "_" +
      targetDate.getHours().toString().padStart(2, "0") +
      targetDate.getMinutes().toString().padStart(2, "0") +
      targetDate.getSeconds().toString().padStart(2, "0");

    const safeSiteName = sanitizeFileName(sessionData.siteName);
    const fileName = `測量前チェック_${safeSiteName}_${dateStr}.pdf`;

    // ── jsPDF 初期化 ────────────────────────────────────────────
    const pdf = new jsPDF("p", "mm", "a4");

    // .pdf-page クラスを持つすべての子要素を取得
    const pages = element.querySelectorAll(".pdf-page");
    if (pages.length === 0) {
      throw new Error("No PDF pages found to render.");
    }

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];

      // ── Step1: html2canvas でテキスト・レイアウトのみキャプチャ ──
      // onclone で画像 img を非表示にし、グレーボックス（placeholder）のみ残す
      const canvas = await html2canvas(pageEl, {
        scale: 2.0, // 画像なしのテキストキャプチャなので 2.0 で十分
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: pageEl.offsetWidth,
        height: pageEl.scrollHeight,
        windowWidth: pageEl.offsetWidth,
        windowHeight: pageEl.scrollHeight,
        onclone: (_clonedDoc, clonedEl) => {
          // 画像要素を非表示にする（placeholder の gray box は残す）
          clonedEl.querySelectorAll("[data-pdf-image] img").forEach((imgEl) => {
            imgEl.style.visibility = "hidden";
          });
        },
      });

      const imgWidth = A4_WIDTH_MM;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > A4_HEIGHT_MM) {
        logger.warn(
          `[PDF] Page ${i + 1} height overflow: ${imgHeight.toFixed(1)}mm > ${A4_HEIGHT_MM}mm. PDFTemplate の PAGE_LIMIT を下げてください。`
        );
      }

      if (i > 0) pdf.addPage();

      // テキスト・レイアウトを配置
      const layoutJpeg = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(layoutJpeg, "JPEG", 0, 0, imgWidth, imgHeight);

      // ── Step2: 画像を直接 jsPDF.addImage() で埋め込み ──────────
      // html2canvas を経由しないため二重 JPEG 圧縮がなく、元画像品質を維持できる
      const pageRect = pageEl.getBoundingClientRect();
      const pixelToMm = imgWidth / pageEl.offsetWidth;

      const imagePlaceholders = pageEl.querySelectorAll("[data-pdf-image]");
      imagePlaceholders.forEach((placeholder) => {
        const imgId = placeholder.dataset.pdfImage;
        const dataUrl = imageUrls[imgId];
        if (!dataUrl) return;

        // ボックスの座標（240×180px wrapper div の位置）
        const boxRect = placeholder.getBoundingClientRect();
        const { x: boxX, y: boxY, w: boxW, h: boxH } = domRectToPdfCoords(
          boxRect,
          pageRect,
          pixelToMm
        );

        // 画像の表示サイズ（data 属性から取得）
        const displayW = parseFloat(placeholder.dataset.displayW || "240");
        const displayH = parseFloat(placeholder.dataset.displayH || "180");

        // ボックス内でセンタリング
        const offsetX = boxW > 0 ? ((boxW - displayW * pixelToMm) / 2) : 0;
        const offsetY = boxH > 0 ? ((boxH - displayH * pixelToMm) / 2) : 0;

        const imgX = boxX + offsetX;
        const imgY = boxY + offsetY;
        const imgW = displayW * pixelToMm;
        const imgH = displayH * pixelToMm;

        // JPEG か PNG かを dataUrl から判定
        const format = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";

        try {
          pdf.addImage(dataUrl, format, imgX, imgY, imgW, imgH);
        } catch (imgErr) {
          logger.warn(`[PDF] Failed to embed image ${imgId}`, imgErr);
        }
      });

      // ── Step3: テキストリンクの埋め込み（従来通り） ─────────────
      const linkElements = pageEl.querySelectorAll(".pdf-link-target");
      linkElements.forEach((linkEl) => {
        const linkRect = linkEl.getBoundingClientRect();
        const { x, y, w, h } = domRectToPdfCoords(linkRect, pageRect, pixelToMm);
        const url = linkEl.getAttribute("data-url");
        if (url) {
          pdf.link(x, y, w, h, { url });
        }
      });
    }

    pdf.save(fileName);
    logger.info("PDF生成完了", { fileName, pages: pages.length });
    return true;
  } catch (error) {
    logger.error("PDF生成失敗", error);
    throw error;
  }
}
