/**
 * PDF出力カスタムフック
 *
 * ResultScreen から PDF 出力関連のロジックを分離する。
 * 以下を管理する:
 *   - 画像プリロード（IndexedDB から dataUrl 取得 + 自然サイズ取得）
 *   - PDF生成の状態管理（isPdfGenerating / pdfError）
 *   - generatePDF の呼び出し
 */

import { useState, useCallback } from "react";
import { getImage } from "../utils/imageDb";
import { generatePDF } from "../utils/pdfGenerator";
import logger from "../utils/logger";

/**
 * @param {object} session - セッションデータ
 * @returns {{
 *   isPdfGenerating: boolean,
 *   pdfError: string|null,
 *   imageUrls: object,
 *   imageDimensions: object,
 *   exportPdf: (pdfRef: React.RefObject) => Promise<void>
 * }}
 */
export function usePdfExport(session) {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [imageUrls, setImageUrls] = useState({});
  const [imageDimensions, setImageDimensions] = useState({}); // { [imgId]: {w, h} }

  const exportPdf = useCallback(
    async (pdfRef) => {
      if (!pdfRef?.current) return;

      setIsPdfGenerating(true);
      setPdfError(null);

      try {
        const sessionImages = session?.images || {};
        const allImageIds = Object.values(sessionImages).flat();
        const urls = {};
        const dims = {};

        for (const imgId of allImageIds) {
          try {
            const blob = await getImage(imgId);
            if (blob) {
              // Blob → dataURL（html2canvas は ObjectURL を正しくレンダリングできないため）
              const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              urls[imgId] = dataUrl;

              // 自然サイズを取得（contain スケーリング計算 + ハイブリッドPDF直接埋め込みに使用）
              const naturalSize = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () =>
                  resolve({ w: img.naturalWidth, h: img.naturalHeight });
                img.onerror = () => resolve(null);
                img.src = dataUrl;
              });
              if (naturalSize) dims[imgId] = naturalSize;
            }
          } catch (err) {
            logger.warn("Failed to preload image for PDF", { imgId, err });
          }
        }

        // state を更新して PDFTemplate を再レンダリングさせる
        setImageUrls(urls);
        setImageDimensions(dims);

        // レンダリング完了を待ってから PDF 化
        await new Promise((resolve) => setTimeout(resolve, 150));

        // ハイブリッド生成: html2canvas(テキスト) + jsPDF.addImage(画像直接埋め込み)
        await generatePDF(pdfRef.current, session, urls);
        logger.info("PDF export successful", { imageCount: allImageIds.length });
      } catch (error) {
        logger.error("PDF generation failed", error, {
          checkId: session?.checkId,
        });
        setPdfError("PDF出力に失敗しました。もう一度お試しください。");
      } finally {
        setIsPdfGenerating(false);
      }
    },
    [session]
  );

  return { isPdfGenerating, pdfError, setPdfError, imageUrls, imageDimensions, exportPdf };
}
