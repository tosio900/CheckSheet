import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { sanitizeFileName } from "./sanitize";
import logger from "./logger";

/**
 * 指定したHTML要素をPDFとして出力する
 * @param {HTMLElement} element - PDF化するHTML要素
 * @param {object} sessionData - セッションデータ（ファイル名用）
 */
export async function generatePDF(element, sessionData) {
  try {
    logger.info("PDF生成開始", { siteName: sessionData.siteName });

    // ファイル名を安全に生成（実施日時または現在時刻を YYYYMMDD_HHMMSS 形式で）
    const targetDate = sessionData.completedAt ? new Date(sessionData.completedAt) : new Date();
    const dateStr = targetDate.getFullYear().toString() +
      (targetDate.getMonth() + 1).toString().padStart(2, "0") +
      targetDate.getDate().toString().padStart(2, "0") + "_" +
      targetDate.getHours().toString().padStart(2, "0") +
      targetDate.getMinutes().toString().padStart(2, "0") +
      targetDate.getSeconds().toString().padStart(2, "0");

    const safeSiteName = sanitizeFileName(sessionData.siteName);
    const fileName = `測量前チェック_${safeSiteName}_${dateStr}.pdf`;

    // A4サイズのPDFを作成 (210mm x 297mm)
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    
    // .pdf-page クラスを持つすべての子要素を取得
    const pages = element.querySelectorAll('.pdf-page');
    
    if (pages.length === 0) {
      throw new Error("No PDF pages found to render.");
    }

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];
      
      // html2canvasでページごとにキャンバスに描画
      const canvas = await html2canvas(pageEl, {
        scale: 2, // 高解像度
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: pageEl.offsetWidth,
        height: pageEl.offsetHeight,
        windowWidth: pageEl.offsetWidth,
        windowHeight: pageEl.offsetHeight,
      });
      
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      // A4ページ高さ(297mm)を超えていた場合、警告ログを出力
      // → PDFTemplate.jsx の PAGE_LIMIT 設定が小さすぎることを示す
      if (imgHeight > 297) {
        logger.warn(`[PDF] Page ${i + 1} height overflow: ${imgHeight.toFixed(1)}mm > 297mm. PDFTemplate.jsx の PAGE_LIMIT を下げてください。`);
      }

      if (i > 0) {
        pdf.addPage();
      }
      
      // (0, 0) から A4サイズ幅に合わせて描画
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

      // 画像化により失われたリンク情報（href）を、手動で座標計算してPDFに追加
      const pageRect = pageEl.getBoundingClientRect();
      const linkElements = pageEl.querySelectorAll('.pdf-link-target');
      
      // ピクセルからPDFの単位 (mm, A4幅=210) への変換係数
      const pixelToMm = imgWidth / pageEl.offsetWidth; 

      linkElements.forEach(linkEl => {
        const linkRect = linkEl.getBoundingClientRect();
        // ページ要素を基準にした相対座標
        const relX = linkRect.left - pageRect.left;
        const relY = linkRect.top - pageRect.top;
        
        const pdfX = relX * pixelToMm;
        const pdfY = relY * pixelToMm;
        const pdfW = linkRect.width * pixelToMm;
        const pdfH = linkRect.height * pixelToMm;
        
        const url = linkEl.getAttribute('data-url');
        if (url) {
          // pdf.link (x, y, w, h, options)
          pdf.link(pdfX, pdfY, pdfW, pdfH, { url });
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
