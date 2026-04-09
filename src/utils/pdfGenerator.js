/**
 * PDF生成ユーティリティ
 * html2canvas + jsPDFで結果をPDF化する
 */

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * 指定したHTML要素をPDFとして出力する
 * @param {HTMLElement} element - PDF化するHTML要素
 * @param {object} sessionData - セッションデータ（ファイル名用）
 */
export async function generatePDF(element, sessionData) {
  try {
    console.log("[PDF] 生成開始...");

    // html2canvasでHTML要素をキャンバスに描画
    const canvas = await html2canvas(element, {
      scale: 2, // 高解像度
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      // スクロール全体をキャプチャ
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    console.log("[PDF] キャンバス生成完了:", canvas.width, "x", canvas.height);

    // A4サイズのPDFを作成
    const imgWidth = 210; // A4幅 (mm)
    const pageHeight = 297; // A4高さ (mm)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF("p", "mm", "a4");

    let heightLeft = imgHeight;
    let position = 0;

    // 1ページ目
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 複数ページ対応
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // ファイル名を生成
    const fileName = `測量前チェック_${sessionData.siteName}_${sessionData.date}.pdf`;
    pdf.save(fileName);

    console.log("[PDF] 生成完了:", fileName);
    return true;
  } catch (error) {
    console.error("[PDF] 生成失敗:", error);
    alert("PDF出力に失敗しました。もう一度お試しください。");
    return false;
  }
}
