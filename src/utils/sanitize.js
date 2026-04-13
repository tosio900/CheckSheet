/**
 * ファイル名に使用できない文字を除去するユーティリティ
 */

/**
 * OS依存の禁止文字をアンダースコアに置換してファイル名を安全にする
 * @param {string} name - 元のファイル名（拡張子なし）
 * @returns {string} サニタイズ済みのファイル名
 */
export function sanitizeFileName(name) {
  if (!name || typeof name !== "string") return "unknown";
  // Windows / macOS / Linux で問題になる文字を置換
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "unknown";
}
