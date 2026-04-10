import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import logger from "./logger";

/**
 * 指定したHTML要素をPDFとして出力する
 * @param {HTMLElement} element - PDF化するHTML要素
 * @param {object} sessionData - セッションデータ（ファイル名用）
 */
export async function generatePDF(element, sessionData) {
  try {
    logger.info("PDF生成開始", { siteName: sessionData.siteName });

    // html2canvasでHTML要素をキャンバスに描画
    const canvas = await html2canvas(element, {
      scale: 2, // 高解像度
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      // 要素のサイズを正確に取得
      width: element.offsetWidth,
      height: element.offsetHeight,
      windowWidth: element.offsetWidth,
      windowHeight: element.offsetHeight,
    });

    logger.debug("キャンバス生成完了", { width: canvas.width, height: canvas.height });

    // A4サイズのPDFを作成 (210mm x 297mm)
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    let heightLeft = imgHeight;
    let position = 0;

    // 1ページ目
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 複数ページ対応
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      // 改ページ時に少し重なりを持たせて情報の欠落を防ぐなどの調整も可能だが、
      // 基本は position をずらして addPage
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // ファイル名を生成
    const fileName = `測量前チェック_${sessionData.siteName}_${sessionData.date}.pdf`;
    pdf.save(fileName);

    logger.info("PDF生成完了", { fileName });
    return true;
  } catch (error) {
    logger.error("PDF生成失敗", error);
    alert("PDF出力に失敗しました。もう一度お試しください。");
    return false;
  }
}
