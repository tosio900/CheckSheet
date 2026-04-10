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
