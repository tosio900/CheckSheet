/**
 * 画像データ永続化ユーティリティ (IndexedDB)
 * 
 * idb-keyval を使用し、画像Blob を IndexedDB に保存する。
 * LocalStorage のセッションデータとは分離された専用ストアを使用する。
 * 
 * Key形式: `img_{sessionId}_{itemId}_{timestamp}`
 */

import { get, set, del, keys, createStore } from "idb-keyval";
import logger from "./logger";

// 専用のストアを作成（デフォルトストアとの衝突を回避）
const imageStore = createStore("checksheet-images-db", "images");

/**
 * 画像IDを生成する
 * @param {string} sessionId - セッションID (checkId)
 * @param {string} itemId - チェック項目ID
 * @returns {string} ユニークな画像ID
 */
export function generateImageId(sessionId, itemId) {
  const ts = Date.now();
  return `img_${sessionId}_${itemId}_${ts}`;
}

/**
 * 画像を IndexedDB に保存する
 * @param {string} imageId - 画像ID
 * @param {Blob} blob - 画像データ (リサイズ済み想定)
 * @returns {Promise<boolean>} 保存成功フラグ
 */
export async function saveImage(imageId, blob) {
  try {
    await set(imageId, blob, imageStore);
    logger.debug("Image saved to IndexedDB", imageId, `${(blob.size / 1024).toFixed(1)}KB`);
    return true;
  } catch (error) {
    logger.error("Failed to save image to IndexedDB", error, { imageId });
    return false;
  }
}

/**
 * 画像を IndexedDB から取得する
 * @param {string} imageId - 画像ID
 * @returns {Promise<Blob|null>} 画像Blob、存在しない場合はnull
 */
export async function getImage(imageId) {
  try {
    const blob = await get(imageId, imageStore);
    if (!blob) {
      logger.debug("Image not found in IndexedDB", imageId);
      return null;
    }
    return blob;
  } catch (error) {
    logger.error("Failed to get image from IndexedDB", error, { imageId });
    return null;
  }
}

/**
 * 画像を IndexedDB から削除する
 * @param {string} imageId - 画像ID
 * @returns {Promise<boolean>} 削除成功フラグ
 */
export async function deleteImage(imageId) {
  try {
    await del(imageId, imageStore);
    logger.debug("Image deleted from IndexedDB", imageId);
    return true;
  } catch (error) {
    logger.error("Failed to delete image from IndexedDB", error, { imageId });
    return false;
  }
}

/**
 * 特定セッションに紐づく全画像を削除する
 * @param {string} sessionId - セッションID (checkId)
 * @returns {Promise<number>} 削除された画像数
 */
export async function deleteSessionImages(sessionId) {
  try {
    const allKeys = await keys(imageStore);
    const sessionKeys = allKeys.filter(
      (key) => typeof key === "string" && key.startsWith(`img_${sessionId}_`)
    );

    let deletedCount = 0;
    for (const key of sessionKeys) {
      await del(key, imageStore);
      deletedCount++;
    }

    logger.info("Session images cleaned up", { sessionId, deletedCount });
    return deletedCount;
  } catch (error) {
    logger.error("Failed to delete session images", error, { sessionId });
    return 0;
  }
}

/**
 * BlobからObject URLを生成する（表示用）
 * ※ 使用後は URL.revokeObjectURL() で解放すること
 * @param {Blob} blob - 画像Blob
 * @returns {string|null} Object URL
 */
export function createImageURL(blob) {
  if (!blob) return null;
  try {
    return URL.createObjectURL(blob);
  } catch (error) {
    logger.error("Failed to create object URL", error);
    return null;
  }
}
