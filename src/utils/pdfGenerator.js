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
      
      if (i > 0) {
        pdf.addPage();
      }
      
      // (0, 0) から A4サイズ幅に合わせて描画
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    }

    pdf.save(fileName);

    logger.info("PDF生成完了", { fileName, pages: pages.length });
    return true;
  } catch (error) {
    logger.error("PDF生成失敗", error);
    throw error;
  }
}
