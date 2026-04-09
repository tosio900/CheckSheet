import { useState, useEffect } from "react";
import HomeScreen from "./components/HomeScreen";
import StartScreen from "./components/StartScreen";
import ChatCheck from "./components/ChatCheck";
import ResultScreen from "./components/ResultScreen";
import InstallPrompt from "./components/InstallPrompt";
import {
  saveCheckSession,
  loadCheckSession,
  clearCheckSession,
  generateCheckId,
} from "./utils/storage";

// /**
//  * メインアプリケーションコンポーネント
//  * (中略)

export default function App() {
  const [screen, setScreen] = useState("home");
  const [session, setSession] = useState(null);
  const [resumeSession, setResumeSession] = useState(() => {
    const saved = loadCheckSession();
    return (saved && saved.status === "in_progress") ? saved : null;
  });

  /**
   * 新規チェック開始
   * @param {boolean} forceNew - trueの場合、既存セッションを破棄して新規開始
   */
  const handleStartNew = (forceNew = false) => {
    if (forceNew || !resumeSession) {
      clearCheckSession();
      setResumeSession(null);
    }
    setScreen("start");
    console.log("[App] 画面遷移: home → start");
  };

  /**
   * 中断中セッションを再開
   */
  const handleResume = () => {
    if (resumeSession) {
      console.log("[App] セッション再開:", resumeSession.checkId);
      setSession(resumeSession);
      setScreen("check");
    }
  };

  /**
   * チェック情報入力完了 → チェック開始
   */
  const handleCheckStart = ({ siteName, inspector, date }) => {
    const newSession = {
      checkId: generateCheckId(),
      siteName,
      inspector,
      date,
      startedAt: new Date().toISOString(),
      completedAt: null,
      status: "in_progress",
      currentIndex: 0,
      answers: [],
    };
    saveCheckSession(newSession);
    setSession(newSession);
    setResumeSession(null);
    setScreen("check");
    console.log("[App] 画面遷移: start → check, session:", newSession.checkId);
  };

  /**
   * チェック完了
   */
  const handleComplete = (completedSession) => {
    console.log("[App] チェック完了:", completedSession.checkId);
    setSession(completedSession);
    setScreen("result");
  };

  /**
   * チェック中断 → ホームに戻る
   */
  const handleExit = () => {
    console.log("[App] チェック中断 → ホームへ");
    const saved = loadCheckSession();
    if (saved && saved.status === "in_progress") {
      setResumeSession(saved);
    }
    setSession(null);
    setScreen("home");
  };

  /**
   * もう一度チェック
   */
  const handleRestart = () => {
    clearCheckSession();
    setResumeSession(null);
    setSession(null);
    setScreen("start");
    console.log("[App] チェックやり直し → start");
  };

  /**
   * ホームに戻る
   */
  const handleGoHome = () => {
    clearCheckSession();
    setResumeSession(null);
    setSession(null);
    setScreen("home");
    console.log("[App] ホームに戻る");
  };

  return (
    <div className="app">
      {/* iOS用PWAインストールガイド（非PWA時のみ表示） */}
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
            // 中断中セッションがある場合はresumeSessionを復元
            const saved = loadCheckSession();
            if (saved && saved.status === "in_progress") {
              setResumeSession(saved);
            }
            setScreen("home");
          }}
        />
      )}

      {screen === "check" && session && (
        <ChatCheck
          session={session}
          onComplete={handleComplete}
          onExit={handleExit}
        />
      )}

      {screen === "result" && session && (
        <ResultScreen
          session={session}
          onRestart={handleRestart}
          onGoHome={handleGoHome}
        />
      )}
    </div>
  );
}
