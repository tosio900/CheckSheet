/**
 * LocalStorage操作ユーティリティ
 * チェックセッションの保存・読み込み・削除を管理
 */

const STORAGE_KEY = "survey_check_session";

/**
 * チェックセッションをLocalStorageに保存
 * @param {object} sessionData - セッションデータ
 */
export function saveCheckSession(sessionData) {
  try {
    const json = JSON.stringify(sessionData);
    localStorage.setItem(STORAGE_KEY, json);
    console.log("[Storage] セッション保存完了:", sessionData.checkId);
    return true;
  } catch (error) {
    console.error("[Storage] セッション保存失敗:", error);
    return false;
  }
}

/**
 * 保存済みセッションをLocalStorageから読み込み
 * @returns {object|null} セッションデータ、存在しない場合はnull
 */
export function loadCheckSession() {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) {
      console.log("[Storage] 保存済みセッションなし");
      return null;
    }
    const data = JSON.parse(json);
    console.log("[Storage] セッション読み込み完了:", data.checkId, "status:", data.status);
    return data;
  } catch (error) {
    console.error("[Storage] セッション読み込み失敗:", error);
    return null;
  }
}

/**
 * セッションデータを削除
 */
export function clearCheckSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log("[Storage] セッション削除完了");
    return true;
  } catch (error) {
    console.error("[Storage] セッション削除失敗:", error);
    return false;
  }
}

/**
 * 中断中（未完了）のセッションが存在するか確認
 * @returns {boolean}
 */
export function hasInProgressSession() {
  const session = loadCheckSession();
  return session !== null && session.status === "in_progress";
}

/**
 * 新しいチェックIDを生成
 * @returns {string} チェックID（例: chk_20260409_001）
 */
export function generateCheckId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, "");
  return `chk_${dateStr}_${timeStr}`;
}

const PROFILE_KEY = "survey_user_profile";

/**
 * ユーザーの入力履歴（現場名、点検者）を保存
 * @param {string} siteName
 * @param {string} inspector
 */
export function saveUserProfile(siteName, inspector) {
  try {
    const data = { siteName, inspector, lastUpdated: new Date().toISOString() };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    console.log("[Storage] プロフィール保存完了");
  } catch (error) {
    console.error("[Storage] プロフィール保存失敗:", error);
  }
}

/**
 * ユーザーの入力履歴（現場名、点検者）を読み込み
 * @returns {{siteName: string, inspector: string}|null}
 */
export function loadUserProfile() {
  try {
    const json = localStorage.getItem(PROFILE_KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch (error) {
    console.error("[Storage] プロフィール読み込み失敗:", error);
    return null;
  }
}
