import { useState } from "react";
import HomeScreen from "./components/HomeScreen";
import StartScreen from "./components/StartScreen";
import ChatCheck from "./components/ChatCheck";
import ResultScreen from "./components/ResultScreen";
import InstallPrompt from "./components/InstallPrompt";
import { useCheckSession } from "./hooks/useCheckSession";
import logger from "./utils/logger";

/**
 * メインアプリケーションコンポーネント
 * 画面ルーティングと全体の調整を行う
 */
export default function App() {
  const [screen, setScreen] = useState("home");
  const { 
    session, 
    resumeSession, 
    startNewSession, 
    resumeActiveSession, 
    updateMemo,
    completeSession,
    resetAll,
    refreshResumeSession
  } = useCheckSession();

  /**
   * 新規チェック開始
   */
  const handleStartNew = (forceNew = false) => {
    if (forceNew) {
      resetAll();
    }
    setScreen("start");
    logger.debug("Navigation: home -> start");
  };

  /**
   * 中断中セッションを再開
   */
  const handleResume = () => {
    if (resumeSession) {
      logger.info("Resuming session", resumeSession.checkId);
      resumeActiveSession();
      setScreen("check");
    }
  };

  /**
   * チェック情報入力完了 → チェック開始
   */
  const handleCheckStart = ({ siteName, inspector, memo }) => {
    startNewSession({ siteName, inspector, memo });
    setScreen("check");
    logger.info("Check started", { siteName, inspector });
    logger.debug("Navigation: start -> check");
  };

  /**
   * チェック完了
   */
  const handleComplete = (completedSession) => {
    logger.info("Check completed", completedSession.checkId);
    completeSession(completedSession);
    setScreen("result");
  };

  /**
   * 結果画面から特定の質問を修正するために戻る
   */
  const handleEditFromResult = (editIndex) => {
    setScreen("check");
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
    setScreen("home");
  };

  /**
   * もう一度チェック
   */
  const handleRestart = () => {
    resetAll();
    setScreen("start");
    logger.debug("Restarting check session");
  };

  /**
   * ホームに戻る
   */
  const handleGoHome = () => {
    resetAll();
    setScreen("home");
    logger.debug("Returning to home screen");
  };

  return (
    <div className="app">
      <InstallPrompt />

      {screen === "home" && (
        <HomeScreen
          onStartNew={handleStartNew}
          onResume={handleResume}
          resumeSession={resumeSession}
        />
      )}

      {screen === "start" && (
        <StartScreen
          onStart={handleCheckStart}
          onBack={() => {
            refreshResumeSession();
            setScreen("home");
          }}
        />
      )}

      {screen === "check" && session && (
        <ChatCheck
          onComplete={handleComplete}
          onExit={handleExit}
        />
      )}

      {screen === "result" && session && (
        <ResultScreen
          onRestart={handleRestart}
          onGoHome={handleGoHome}
          onEdit={handleEditFromResult}
          onUpdateMemo={handleMemoUpdate}
        />
      )}
    </div>
  );
}
