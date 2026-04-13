/**
 * 画像リサイズユーティリティ
 *
 * Camera APIやファイル選択で取得した画像を、
 * メモリ消費とPDFサイズを抑えるためにリサイズする。
 *
 * リサイズは Canvas API を使用し、長辺を最大 MAX_DIMENSION px に制限する。
 */

import logger from "./logger";

/** 長辺の最大ピクセル数 */
const MAX_DIMENSION = 1024;

/** JPEG品質 (0.0 ~ 1.0) */
const JPEG_QUALITY = 0.80;

/**
 * File/Blob から Image 要素を生成する
 * @param {File|Blob} file - 画像ファイル
 * @returns {Promise<HTMLImageElement>} 読み込み済みの画像要素
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * 画像をリサイズしてBlobとして返す
 * 長辺が MAX_DIMENSION 以下の場合はリサイズせず、品質のみ調整する。
 *
 * @param {File|Blob} file - 元の画像ファイル
 * @param {object} [options] - オプション
 * @param {number} [options.maxDimension=1024] - 長辺の最大ピクセル数
 * @param {number} [options.quality=0.80] - JPEG圧縮品質
 * @returns {Promise<Blob>} リサイズ後の画像Blob (JPEG)
 */
export async function resizeImage(file, options = {}) {
  const maxDim = options.maxDimension || MAX_DIMENSION;
  const quality = options.quality || JPEG_QUALITY;

  try {
    const img = await loadImage(file);
    let { width, height } = img;

    logger.debug("Image original size", { width, height, fileSize: `${(file.size / 1024).toFixed(1)}KB` });

    // リサイズ比率を計算
    const ratio = Math.min(maxDim / width, maxDim / height, 1);
    const newWidth = Math.round(width * ratio);
    const newHeight = Math.round(height * ratio);

    // Canvas に描画
    const canvas = document.createElement("canvas");
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Canvas → Blob (JPEG)
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("Canvas toBlob returned null"));
        },
        "image/jpeg",
        quality
      );
    });

    logger.debug("Image resized", {
      from: `${width}x${height}`,
      to: `${newWidth}x${newHeight}`,
      newSize: `${(blob.size / 1024).toFixed(1)}KB`,
    });

    return blob;
  } catch (error) {
    logger.error("Image resize failed", error);
    throw error;
  }
}

/**
 * Canvas要素（注釈付き画像）をBlobとして出力する
 * @param {HTMLCanvasElement} canvas - 注釈が描画されたCanvas
 * @param {number} [quality=0.80] - JPEG圧縮品質
 * @returns {Promise<Blob>} 注釈付き画像Blob
 */
export async function canvasToBlob(canvas, quality = JPEG_QUALITY) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Canvas toBlob returned null"));
      },
      "image/jpeg",
      quality
    );
  });
}
