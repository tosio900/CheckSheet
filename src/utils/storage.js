import { STORAGE_KEYS } from "../constants/session";
import logger from "./logger";

/**
 * チェックセッションをLocalStorageに保存
 * @param {object} sessionData - セッションデータ
 */
export function saveCheckSession(sessionData) {
  try {
    const json = JSON.stringify(sessionData);
    localStorage.setItem(STORAGE_KEYS.SESSION, json);
    logger.debug("Session saved to storage", sessionData.checkId);
    return true;
  } catch (error) {
    logger.error("Failed to save session to storage", error);
    return false;
  }
}

/**
 * 保存済みセッションをLocalStorageから読み込み
 * @returns {object|null} セッションデータ、存在しない場合はnull
 */
export function loadCheckSession() {
  try {
    const json = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!json) {
      logger.debug("No saved session found in storage");
      return null;
    }
    const data = JSON.parse(json);
    logger.debug("Session loaded from storage", data.checkId, "status:", data.status);
    return data;
  } catch (error) {
    logger.error("Failed to load session from storage", error);
    return null;
  }
}

/**
 * セッションデータを削除
 */
export function clearCheckSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    logger.debug("Session cleared from storage");
    return true;
  } catch (error) {
    logger.error("Failed to clear session from storage", error);
    return false;
  }
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



/**
 * ユーザーの入力履歴（現場名、点検者）を保存
 * @param {string} siteName
 * @param {string} inspector
 */
export function saveUserProfile(siteName, inspector) {
  try {
    const data = { siteName, inspector, lastUpdated: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data));
    logger.debug("User profile saved to storage");
  } catch (error) {
    logger.error("Failed to save user profile to storage", error);
  }
}

/**
 * ユーザーの入力履歴（現場名、点検者）を読み込み
 * @returns {{siteName: string, inspector: string}|null}
 */
export function loadUserProfile() {
  try {
    const json = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!json) return null;
    return JSON.parse(json);
  } catch (error) {
    logger.error("Failed to load user profile from storage", error);
    return null;
  }
}

/**
 * 完了したセッションを履歴に追加（最大50件）
 * @param {object} sessionData
 */
export function saveSessionToHistory(sessionData) {
  try {
    const history = loadHistory();
    const existingIndex = history.findIndex(h => h.checkId === sessionData.checkId);
    if (existingIndex >= 0) {
      history[existingIndex] = sessionData; // 更新
    } else {
      history.unshift(sessionData); // 先頭に追加
    }
    if (history.length > 50) {
      history.length = 50;
    }
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    logger.debug("Session saved to history", sessionData.checkId);
  } catch (error) {
    logger.error("Failed to save session to history", error);
  }
}

/**
 * 履歴一覧を読み込み
 * @returns {Array<object>}
 */
export function loadHistory() {
  try {
    const json = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!json) return [];
    return JSON.parse(json);
  } catch (error) {
    logger.error("Failed to load history", error);
    return [];
  }
}
