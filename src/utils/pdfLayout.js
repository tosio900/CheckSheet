/**
 * PDFページ分割ロジック（純粋関数）
 *
 * JSX を一切含まず、セッションデータからページごとのブロックリストを計算する。
 * PDFTemplate はこの出力を受け取って JSX に変換するだけになる。
 *
 * ブロック型:
 *   - { type: 'page-header' }
 *   - { type: 'category', cat }
 *   - { type: 'question', item, hasImages }
 *   - { type: 'image-row', item, rowIdx, rowImageIds, isLastRow }
 *   - { type: 'footer' }
 */

import { getItemImageIds } from "../domain/sessionLogic";
import {
  PAGE_LIMIT,
  CATEGORY_HEADER_WEIGHT,
  FOOTER_WEIGHT,
  HEADER_BASE_WEIGHT,
  HEADER_MEMO_LINE_WEIGHT,
  IMAGES_PER_ROW,
  IMAGES_WEIGHT_PER_ROW,
  calcQuestionWeight,
  calcImageRowCount,
} from "./pdfConfig";

/**
 * セッションデータからPDFページのブロック配列を計算する
 *
 * @param {object} session - セッションデータ
 * @param {Array} categorizedAnswers - カテゴリ別回答
 * @returns {Array<Array<object>>} ページごとのブロックリスト
 */
export function computePageLayout(session, categorizedAnswers) {
  const sessionImages = session.images || {};
  const memoText = session.memo || "";
  const memoLines = memoText ? memoText.split("\n").length : 1;
  const headerWeight = HEADER_BASE_WEIGHT + memoLines * HEADER_MEMO_LINE_WEIGHT;

  const pages = [];
  let currentBlocks = [];
  let currentWeight = 0;

  const breakPage = () => {
    pages.push(currentBlocks);
    currentBlocks = [];
    currentWeight = 0;
  };

  // 1. ページヘッダー（セッション情報テーブル）
  currentBlocks.push({ type: "page-header" });
  currentWeight += headerWeight;

  // 2. カテゴリ・項目
  categorizedAnswers.forEach((cat) => {
    const firstItem = cat.answers[0];
    const firstItemImageIds = firstItem
      ? getItemImageIds(sessionImages, firstItem.id)
      : [];
    const firstItemImageRows = calcImageRowCount(firstItemImageIds);
    const firstItemQWeight = firstItem ? calcQuestionWeight(firstItem) : 1.7;

    // アンカーウェイト: 質問+1行目画像は同ページに収める
    const firstItemAnchorWeight =
      firstItemQWeight + (firstItemImageRows > 0 ? IMAGES_WEIGHT_PER_ROW : 0);
    const requiredForHeader = CATEGORY_HEADER_WEIGHT + firstItemAnchorWeight;

    if (currentWeight + requiredForHeader > PAGE_LIMIT) {
      breakPage();
    }

    currentBlocks.push({ type: "category", cat });
    currentWeight += CATEGORY_HEADER_WEIGHT;

    cat.answers.forEach((item) => {
      const itemImageIds = getItemImageIds(sessionImages, item.id);
      const imageRowCount = calcImageRowCount(itemImageIds);
      const qWeight = calcQuestionWeight(item);

      // アンカーウェイト（質問+1行目画像）で改ページ判定
      const firstRowWeight = imageRowCount > 0 ? IMAGES_WEIGHT_PER_ROW : 0;
      const anchorWeight = qWeight + firstRowWeight;

      if (currentWeight + anchorWeight > PAGE_LIMIT) {
        breakPage();
      }

      // 質問ブロック
      const hasImages = itemImageIds.length > 0;
      currentBlocks.push({ type: "question", item, hasImages });
      currentWeight += qWeight;

      // 画像行ブロック（2行目以降は改ページ可能）
      for (let rowIdx = 0; rowIdx < imageRowCount; rowIdx++) {
        const rowImageIds = itemImageIds.slice(
          rowIdx * IMAGES_PER_ROW,
          (rowIdx + 1) * IMAGES_PER_ROW
        );
        const isLastRow = rowIdx === imageRowCount - 1;

        if (rowIdx > 0 && currentWeight + IMAGES_WEIGHT_PER_ROW > PAGE_LIMIT) {
          breakPage();
        }

        currentBlocks.push({
          type: "image-row",
          item,
          rowIdx,
          rowImageIds,
          isLastRow,
        });
        currentWeight += IMAGES_WEIGHT_PER_ROW;
      }
    });
  });

  // 3. フッター
  if (currentWeight + FOOTER_WEIGHT > PAGE_LIMIT) {
    breakPage();
  }
  currentBlocks.push({ type: "footer" });
  pages.push(currentBlocks);

  return pages;
}
