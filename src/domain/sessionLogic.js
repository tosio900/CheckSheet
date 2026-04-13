/**
 * セッションに関する純粋なビジネスロジック（純粋関数）
 */

import { SESSION_STATUS } from "../constants/session";

/**
 * 回答オブジェクトを生成する
 */
export function createAnswerObject(item, answer, inputs) {
  return {
    categoryId: item.categoryId,
    itemId: item.id,
    question: item.question,
    answer,
    inputs: item.inputs ? { ...inputs } : null,
    answeredAt: new Date().toISOString(),
  };
}

/**
 * 回答リストを更新する（既存の項目があれば置換、なければ追加）
 */
export function updateAnswersList(answers, newAnswer) {
  const updated = [...answers];
  const index = updated.findIndex((a) => a.itemId === newAnswer.itemId);
  
  if (index >= 0) {
    updated[index] = newAnswer;
  } else {
    updated.push(newAnswer);
  }
  
  return updated;
}

/**
 * 次の質問インデックスを計算する
 */
export function calculateNextIndex(currentIndex, totalItems) {
  const next = currentIndex + 1;
  return next < totalItems ? next : currentIndex;
}

/**
 * セッションが完了状態か判定する
 * ユニークな回答済み項目数で判定（重複回答があっても正確に判定）
 */
export function isSessionCompleted(answers, totalItems) {
  const uniqueItemIds = new Set(answers.map(a => a.itemId));
  return uniqueItemIds.size >= totalItems;
}

/**
 * セッション概要（はい/いいえの数）を計算する
 */
export function calculateSummary(answers) {
  return {
    yesCount: answers.filter((a) => a.answer === "yes").length,
    noCount: answers.filter((a) => a.answer === "no").length,
  };
}

/**
 * 画像IDをセッションの images マップに追加する
 * @param {object} images - { [itemId]: [imageId, ...] }
 * @param {string} itemId - チェック項目ID
 * @param {string} imageId - 画像ID
 * @returns {object} 更新された images マップ
 */
export function addImageToSession(images, itemId, imageId) {
  const updated = { ...images };
  if (!updated[itemId]) {
    updated[itemId] = [];
  }
  updated[itemId] = [...updated[itemId], imageId];
  return updated;
}

/**
 * 画像IDをセッションの images マップから削除する
 * @param {object} images - { [itemId]: [imageId, ...] }
 * @param {string} itemId - チェック項目ID
 * @param {string} imageId - 画像ID
 * @returns {object} 更新された images マップ
 */
export function removeImageFromSession(images, itemId, imageId) {
  const updated = { ...images };
  if (updated[itemId]) {
    updated[itemId] = updated[itemId].filter((id) => id !== imageId);
    if (updated[itemId].length === 0) {
      delete updated[itemId];
    }
  }
  return updated;
}

/**
 * 特定の項目に紐づく画像IDリストを取得する
 * @param {object} images - { [itemId]: [imageId, ...] }
 * @param {string} itemId - チェック項目ID
 * @returns {string[]} 画像IDリスト
 */
export function getItemImageIds(images, itemId) {
  return (images && images[itemId]) || [];
}
