import { useState } from "react";
import HomeScreen from "./components/HomeScreen";
import StartScreen from "./components/StartScreen";
import ChatCheck from "./components/ChatCheck";
import ResultScreen from "./components/ResultScreen";
import HistoryScreen from "./components/HistoryScreen";
import TemplateManager from "./components/admin/TemplateManager";
import TemplateEditor from "./components/admin/TemplateEditor";
import InstallPrompt from "./components/InstallPrompt";
import Toast from "./components/common/Toast";
import LoadingOverlay from "./components/common/LoadingOverlay";
import { useCheckSession } from "./hooks/useCheckSession";
import { useTemplates } from "./providers/TemplateContext";
import { getAllItems } from "./data/checkItems";
import { SCREENS } from "./constants/screens";
import { getCurrentLocation } from "./utils/location";
import logger from "./utils/logger";

/**
 * メインアプリケーションコンポーネント
 * 画面ルーティングと全体の調整を行う
 */
export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [viewHistorySession, setViewHistorySession] = useState(null);
  const [isEditingAfterComplete, setIsEditingAfterComplete] = useState(false);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  const { saveTemplate } = useTemplates();
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

  /**
   * 新規チェック開始
   */
  const handleStartNew = (forceNew = false) => {
    if (forceNew) {
      resetAll();
    }
    setIsEditingAfterComplete(false);
    setScreen(SCREENS.START);
    logger.debug("Navigation: home -> start");
  };

  /**
   * 中断中セッションを再開
   */
  const handleResume = () => {
    if (resumeSession) {
      logger.info("Resuming session", resumeSession.checkId);
      resumeActiveSession();
      setIsEditingAfterComplete(false);
      setScreen(SCREENS.CHECK);
    }
  };

  /**
   * チェック情報入力完了 → チェック開始
   */
  const handleCheckStart = ({ siteName, inspector, memo }) => {
    startNewSession({ siteName, inspector, memo });
    setIsEditingAfterComplete(false);
    setScreen(SCREENS.CHECK);
    logger.info("Check started", { siteName, inspector });
    logger.debug("Navigation: start -> check");
  };

  /**
   * チェック完了
   */
  const handleComplete = async () => {
    logger.info("Check completed action started");
    
    // GPS位置情報の取得（最大3秒）
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
  };

  /**
   * 結果画面から特定の質問を修正するために戻る
   */
  const handleEditFromResult = (editIndex) => {
    // editIndex は session.answers 配列内のインデックス
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
  };

  /**
   * メモの更新
   */
  const handleMemoUpdate = (newMemo) => {
    updateMemo(newMemo);
  };

  /**
   * チェック中断 → ホームに戻る
   */
  const handleExit = () => {
    logger.info("Check interrupted, returning to home");
    refreshResumeSession();
    setScreen(SCREENS.HOME);
  };

  /**
   * もう一度チェック
   */
  const handleRestart = () => {
    resetAll();
    setIsEditingAfterComplete(false);
    setScreen(SCREENS.START);
    logger.debug("Restarting check session");
  };

  /**
   * ホームに戻る
   */
  const handleGoHome = () => {
    resetAll();
    setViewHistorySession(null);
    setIsEditingAfterComplete(false);
    setScreen(SCREENS.HOME);
    logger.debug("Returning to home screen");
  };

  /**
   * 履歴一覧を開く
   */
  const handleOpenHistory = () => {
    setScreen(SCREENS.HISTORY);
  };

  /**
   * テンプレート管理を開く
   */
  const handleOpenAdmin = () => {
    setScreen(SCREENS.ADMIN_TEMPLATES);
  };

  /**
   * テンプレート編集画面へ遷移
   */
  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setScreen(SCREENS.ADMIN_EDITOR);
  };

  /**
   * テンプレート変更を保存
   */
  const handleSaveTemplate = async (updatedTemplate) => {
    try {
      await saveTemplate(updatedTemplate);
      setEditingTemplate(null);
      setScreen(SCREENS.ADMIN_TEMPLATES);
      logger.info("Template saved and returned to list", updatedTemplate.id);
    } catch (err) {
      logger.error("Failed to save template", err);
    }
  };

  /**
   * 特定の履歴詳細を閲覧する
   */
  const handleViewHistoryDetail = (historyData) => {
    setViewHistorySession(historyData);
    setScreen(SCREENS.RESULT);
  };

  return (
    <div className="app">
      <InstallPrompt />
      {isCapturingGps && <LoadingOverlay message="位置情報を取得中..." />}

      {screen === SCREENS.HOME && (
        <HomeScreen
          onStartNew={handleStartNew}
          onResume={handleResume}
          resumeSession={resumeSession}
          onOpenHistory={handleOpenHistory}
          onOpenAdmin={handleOpenAdmin}
        />
      )}

      {screen === SCREENS.ADMIN_TEMPLATES && (
        <TemplateManager 
          onBack={() => setScreen(SCREENS.HOME)}
          onEditTemplate={handleEditTemplate}
        />
      )}

      {screen === SCREENS.ADMIN_EDITOR && editingTemplate && (
        <TemplateEditor 
          template={editingTemplate}
          onBack={() => {
            setEditingTemplate(null);
            setScreen(SCREENS.ADMIN_TEMPLATES);
          }}
          onSave={handleSaveTemplate}
        />
      )}

      {screen === SCREENS.START && (
        <StartScreen
          onStart={handleCheckStart}
          onBack={() => {
            refreshResumeSession();
            setScreen(SCREENS.HOME);
          }}
        />
      )}

      {screen === SCREENS.CHECK && session && (
        <ChatCheck
          onComplete={handleComplete}
          onExit={handleExit}
          isEditingAfterComplete={isEditingAfterComplete}
        />
      )}

      {screen === SCREENS.HISTORY && (
        <HistoryScreen
          onBack={() => setScreen(SCREENS.HOME)}
          onViewHistory={handleViewHistoryDetail}
        />
      )}

      {screen === SCREENS.RESULT && (session || viewHistorySession) && (
        <ResultScreen
          sessionOverride={viewHistorySession}
          isReadOnly={!!viewHistorySession}
          onRestart={handleRestart}
          onGoHome={viewHistorySession ? () => {
            setViewHistorySession(null);
            setScreen(SCREENS.HISTORY);
          } : handleGoHome}
          onEdit={viewHistorySession ? undefined : handleEditFromResult}
          onUpdateMemo={viewHistorySession ? undefined : handleMemoUpdate}
        />
      )}

      {saveError && (
        <Toast message={saveError} type="error" onClose={clearSaveError} />
      )}
      {syncWarning && (
        <Toast message={syncWarning} type="warning" autoClose={false} onClose={clearSyncWarning} />
      )}
    </div>
  );
}
