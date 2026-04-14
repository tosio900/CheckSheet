/**
 * PDF出力・ページ分割 共通定数・ヘルパー関数
 *
 * キャリブレーション値の一元管理。変更はここだけで完結する。
 *
 * ウェイト設計: 1 weight ≒ 23.6px
 * A4有効高さ: scrollHeight ベース → 1244÷23.6 ≒ 52.7 weight が上限
 * 安全マージン込みで PAGE_LIMIT = 51
 */

/** ページ分割閾値 (weight 単位) */
export const PAGE_LIMIT = 51;

/** 1 weight あたりのピクセル数（キャリブレーション実測値） */
export const PX_PER_WEIGHT = 23.6;

/** 1行あたりの最大画像枚数: 240px×3 + gap8px×2 = 736px（利用可能760px以内） */
export const IMAGES_PER_ROW = 3;

/** 画像ボックス幅 (px) */
export const IMAGE_BOX_W = 240;

/** 画像ボックス高さ (px) */
export const IMAGE_BOX_H = 180;

/**
 * 画像行 1 行あたりのウェイト
 * 計算: IMAGE_BOX_H(180) + padding上下(8+12)=20px → 200px ÷ 23.6 ≈ 8.47 → 安全マージン 9.0
 */
export const IMAGES_WEIGHT_PER_ROW = 9.0;

/** pdf-page の幅 (px) */
export const PAGE_WIDTH_PX = 880;

/** pdf-page の padding (px) */
export const PAGE_PADDING_PX = 40;

/** カテゴリヘッダーのウェイト */
export const CATEGORY_HEADER_WEIGHT = 2.0;

/** フッターのウェイト */
export const FOOTER_WEIGHT = 2.0;

/** ヘッダーのベースウェイト（情報テーブル部分） */
export const HEADER_BASE_WEIGHT = 10;

/** メモの1行あたりの追加ウェイト */
export const HEADER_MEMO_LINE_WEIGHT = 0.8;

// ─────────────────────────────────────────────────────────

/**
 * チェック項目の質問ウェイトを計算する
 * @param {object} item - チェック項目
 * @returns {number} ウェイト（入力フィールドあり=2.8、なし=1.7）
 */
export function calcQuestionWeight(item) {
  return item.inputs ? 2.8 : 1.7;
}

/**
 * 画像IDリストから行数を計算する
 * @param {string[]} imageIds - 画像IDリスト
 * @returns {number} 行数
 */
export function calcImageRowCount(imageIds) {
  if (!imageIds || imageIds.length === 0) return 0;
  return Math.ceil(imageIds.length / IMAGES_PER_ROW);
}

/**
 * objectFit: contain 相当のスケーリングを計算する
 * html2canvas は objectFit 非対応のため JS で同等の計算を行う。
 * → ボックスの縦か横いっぱいに拡大・縮小し、アスペクト比を保持する。
 *
 * @param {number} naturalW - 画像の自然幅 (px)
 * @param {number} naturalH - 画像の自然高さ (px)
 * @param {number} [boxW=IMAGE_BOX_W] - ボックス幅 (px)
 * @param {number} [boxH=IMAGE_BOX_H] - ボックス高さ (px)
 * @returns {{ displayW: number, displayH: number }} 表示サイズ
 */
export function calcContainSize(naturalW, naturalH, boxW = IMAGE_BOX_W, boxH = IMAGE_BOX_H) {
  if (!naturalW || !naturalH || naturalW <= 0 || naturalH <= 0) {
    return { displayW: boxW, displayH: boxH };
  }
  const scale = Math.min(boxW / naturalW, boxH / naturalH);
  return {
    displayW: Math.round(naturalW * scale),
    displayH: Math.round(naturalH * scale),
  };
}
