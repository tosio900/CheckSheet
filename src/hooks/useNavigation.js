import { useState, useCallback } from "react";
import { useCheckSession } from "./useCheckSession";
import { useTemplates } from "../providers/TemplateContext";
import { getAllItems } from "../data/checkItems";
import { SCREENS } from "../constants/screens";
import { getCurrentLocation } from "../utils/location";
import logger from "../utils/logger";

/**
 * アプリケーションのナビゲーション状態とハンドラを管理するカスタムフック
 *
 * App.jsx から画面遷移ロジックを分離し、
 * App.jsx をレイアウト・表示の責務のみに絞る。
 */
export function useNavigation() {
  const {
    session,
    resumeSession,
    startNewSession,
    resumeActiveSession,
    updateMemo,
    completeSession,
    resetAll,
    refreshResumeSession,
    goToIndex,
    saveError,
    syncWarning,
    clearSaveError,
    clearSyncWarning,
  } = useCheckSession();

  const { saveTemplate } = useTemplates();

  // ── ナビゲーション状態 ──────────────────────────────────────
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [viewHistorySession, setViewHistorySession] = useState(null);
  const [isEditingAfterComplete, setIsEditingAfterComplete] = useState(false);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // ── ナビゲーションハンドラ ───────────────────────────────────

  /** 新規チェック開始 */
  const handleStartNew = useCallback((forceNew = false) => {
    if (forceNew) {
      resetAll();
    }
    setIsEditingAfterComplete(false);
    setScreen(SCREENS.START);
    logger.debug("Navigation: home -> start");
  }, [resetAll]);

  /** 中断中セッションを再開 */
  const handleResume = useCallback(() => {
    if (resumeSession) {
      logger.info("Resuming session", resumeSession.checkId);
      resumeActiveSession();
      setIsEditingAfterComplete(false);
      setScreen(SCREENS.CHECK);
    }
  }, [resumeSession, resumeActiveSession]);

  /** チェック情報入力完了 → チェック開始 */
  const handleCheckStart = useCallback(({ siteName, inspector, memo }) => {
    startNewSession({ siteName, inspector, memo });
    setIsEditingAfterComplete(false);
    setScreen(SCREENS.CHECK);
    logger.info("Check started", { siteName, inspector });
    logger.debug("Navigation: start -> check");
  }, [startNewSession]);

  /** チェック完了（GPS取得 → 完了処理） */
  const handleComplete = useCallback(async () => {
    logger.info("Check completed action started");

    setIsCapturingGps(true);
    let gpsUpdates = {};
    try {
      const gpsData = await getCurrentLocation();
      if (gpsData) {
        logger.info("GPS captured", gpsData);
        gpsUpdates = { gps: gpsData };
      } else {
        logger.warn("GPS capture skipped or failed");
      }
    } catch (err) {
      logger.error("Error during GPS capture", err);
    } finally {
      setIsCapturingGps(false);
    }

    completeSession(gpsUpdates);
    setIsEditingAfterComplete(false);
    setScreen(SCREENS.RESULT);
  }, [completeSession]);

  /** 結果画面から特定の質問を修正するために戻る */
  const handleEditFromResult = useCallback((editIndex) => {
    if (editIndex >= 0 && session?.answers?.[editIndex]) {
      const allItems = getAllItems();
      const targetItemId = session.answers[editIndex].itemId;
      const itemIndex = allItems.findIndex(item => item.id === targetItemId);
      if (itemIndex >= 0) {
        goToIndex(itemIndex);
      } else {
        logger.warn("Edit target item not found in allItems", { editIndex, targetItemId });
      }
    }
    setIsEditingAfterComplete(true);
    setScreen(SCREENS.CHECK);
    logger.debug("Returning to check screen for edit", { index: editIndex });
  }, [session?.answers, goToIndex]);

  /** メモの更新 */
  const handleMemoUpdate = useCallback((newMemo) => {
    updateMemo(newMemo);
  }, [updateMemo]);

  /** チェック中断 → ホームに戻る */
  const handleExit = useCallback(() => {
    logger.info("Check interrupted, returning to home");
    refreshResumeSession();
    setScreen(SCREENS.HOME);
  }, [refreshResumeSession]);

  /** もう一度チェック */
  const handleRestart = useCallback(() => {
    resetAll();
    setIsEditingAfterComplete(false);
    setScreen(SCREENS.START);
    logger.debug("Restarting check session");
  }, [resetAll]);

  /** ホームに戻る */
  const handleGoHome = useCallback(() => {
    resetAll();
    setViewHistorySession(null);
    setIsEditingAfterComplete(false);
    setScreen(SCREENS.HOME);
    logger.debug("Returning to home screen");
  }, [resetAll]);

  /** 履歴一覧を開く */
  const handleOpenHistory = useCallback(() => {
    setScreen(SCREENS.HISTORY);
  }, []);

  /** テンプレート管理を開く */
  const handleOpenAdmin = useCallback(() => {
    setScreen(SCREENS.ADMIN_TEMPLATES);
  }, []);

  /** テンプレート編集画面へ遷移 */
  const handleEditTemplate = useCallback((template) => {
    setEditingTemplate(template);
    setScreen(SCREENS.ADMIN_EDITOR);
  }, []);

  /** テンプレート変更を保存 */
  const handleSaveTemplate = useCallback(async (updatedTemplate) => {
    try {
      await saveTemplate(updatedTemplate);
      setEditingTemplate(null);
      setScreen(SCREENS.ADMIN_TEMPLATES);
      logger.info("Template saved and returned to list", updatedTemplate.id);
    } catch (err) {
      logger.error("Failed to save template", err);
    }
  }, [saveTemplate]);

  /** 特定の履歴詳細を閲覧する */
  const handleViewHistoryDetail = useCallback((historyData) => {
    setViewHistorySession(historyData);
    setScreen(SCREENS.RESULT);
  }, []);

  /** 履歴詳細から履歴一覧に戻る */
  const handleBackToHistory = useCallback(() => {
    setViewHistorySession(null);
    setScreen(SCREENS.HISTORY);
  }, []);

  /** テンプレート管理画面からホームに戻る */
  const handleBackFromAdmin = useCallback(() => {
    setScreen(SCREENS.HOME);
  }, []);

  /** テンプレートエディタからテンプレート一覧に戻る */
  const handleBackFromEditor = useCallback(() => {
    setEditingTemplate(null);
    setScreen(SCREENS.ADMIN_TEMPLATES);
  }, []);

  /** スタート画面からホームに戻る */
  const handleBackFromStart = useCallback(() => {
    refreshResumeSession();
    setScreen(SCREENS.HOME);
  }, [refreshResumeSession]);

  return {
    // 状態
    screen,
    viewHistorySession,
    isEditingAfterComplete,
    isCapturingGps,
    editingTemplate,
    session,
    resumeSession,
    saveError,
    syncWarning,
    // ハンドラ
    handleStartNew,
    handleResume,
    handleCheckStart,
    handleComplete,
    handleEditFromResult,
    handleMemoUpdate,
    handleExit,
    handleRestart,
    handleGoHome,
    handleOpenHistory,
    handleOpenAdmin,
    handleEditTemplate,
    handleSaveTemplate,
    handleViewHistoryDetail,
    handleBackToHistory,
    handleBackFromAdmin,
    handleBackFromEditor,
    handleBackFromStart,
    clearSaveError,
    clearSyncWarning,
  };
}
