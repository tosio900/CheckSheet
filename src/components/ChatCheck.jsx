import { useState, useCallback } from "react";
import { getAllItems, TOTAL_ITEMS } from "../data/checkItems";
import { saveCheckSession } from "../utils/storage";

/**
 * チェック実行画面（メインチェック画面）
 * 一問一答形式で質問を表示し、回答を記録する
 */
export default function ChatCheck({ session, onComplete, onExit }) {
  const allItems = getAllItems();

  const [currentIndex, setCurrentIndex] = useState(session.currentIndex || 0);
  const [answers, setAnswers] = useState(session.answers || []);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [animKey, setAnimKey] = useState(0); // アニメーションリトリガー用

  const currentItem = allItems[currentIndex];
  const progress = answers.length;
  const percentage = Math.round((progress / TOTAL_ITEMS) * 100);

  /**
   * セッションデータをLocalStorageに自動保存
   */
  const autoSave = useCallback(
    (updatedAnswers, updatedIndex) => {
      const updatedSession = {
        ...session,
        answers: updatedAnswers,
        currentIndex: updatedIndex,
        status: "in_progress",
      };
      saveCheckSession(updatedSession);
      console.log("[ChatCheck] 自動保存完了 index:", updatedIndex, "answers:", updatedAnswers.length);
    },
    [session]
  );

  /**
   * 回答を処理
   * @param {"yes"|"no"} answer
   */
  const handleAnswer = (answer) => {
    console.log("[ChatCheck] 回答:", currentItem.id, answer);

    const newAnswer = {
      categoryId: currentItem.categoryId,
      itemId: currentItem.id,
      question: currentItem.question,
      answer,
      answeredAt: new Date().toISOString(),
    };

    // 振動フィードバック（デバイスサポート時のみ、軽めに30ms）
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }

    // 既存の回答を上書きまたは追加
    const updatedAnswers = [...answers];
    const existingIdx = updatedAnswers.findIndex(
      (a) => a.itemId === currentItem.id
    );
    if (existingIdx >= 0) {
      updatedAnswers[existingIdx] = newAnswer;
    } else {
      updatedAnswers.push(newAnswer);
    }

    setAnswers(updatedAnswers);

    const nextIndex = currentIndex + 1;

    if (nextIndex >= allItems.length) {
      // 全項目完了
      console.log("[ChatCheck] 全項目完了！");
      const completedSession = {
        ...session,
        answers: updatedAnswers,
        currentIndex: nextIndex,
        status: "completed",
        completedAt: new Date().toISOString(),
      };
      saveCheckSession(completedSession);
      onComplete(completedSession);
    } else {
      // 次の質問へ
      setCurrentIndex(nextIndex);
      setAnimKey((prev) => prev + 1);
      autoSave(updatedAnswers, nextIndex);
    }
  };

  /**
   * 前の質問に戻る
   */
  const handleBack = () => {
    if (currentIndex > 0) {
      console.log("[ChatCheck] 前の質問に戻る:", currentIndex - 1);
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setAnimKey((prev) => prev + 1);
      autoSave(answers, prevIndex);
    }
  };

  /**
   * 特定の過去の質問に戻る (Undo)
   */
  const handleHistoryTap = (targetItemId) => {
    const targetIndex = allItems.findIndex((item) => item.id === targetItemId);
    if (targetIndex >= 0 && targetIndex < currentIndex) {
      console.log("[ChatCheck] 履歴から戻る:", targetIndex);
      setCurrentIndex(targetIndex);
      setAnimKey((prev) => prev + 1);
      autoSave(answers, targetIndex);
    }
  };

  /**
   * 中断して終了
   */
  const handleExit = () => {
    autoSave(answers, currentIndex);
    onExit();
  };

  // 直近5件の回答履歴を取得
  const recentHistory = [...answers].slice(-5);

  if (!currentItem) return null;

  return (
    <div className="check-screen">
      {/* ヘッダー */}
      <div className="check-header">
        <div className="check-header-top">
          <span className="check-header-title">測量前チェック</span>
          <button
            className="check-header-close"
            onClick={() => setShowExitConfirm(true)}
            aria-label="中断して閉じる"
            id="btn-exit-check"
          >
            ✕
          </button>
        </div>

        {/* プログレスバー */}
        <div className="progress-container">
          <div className="progress-info">
            <span className="progress-category">{currentItem.categoryName}</span>
            <span className="progress-count">
              {progress}/{TOTAL_ITEMS}項目完了 ({percentage}%)
            </span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${percentage}%` }}
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>

      {/* 履歴リスト表示エリア */}
      {recentHistory.length > 0 && (
        <div className="history-feed">
          {recentHistory.map((historyItem) => {
            const hIndex = allItems.findIndex((i) => i.id === historyItem.itemId) + 1;
            return (
              <div 
                key={historyItem.itemId} 
                className="history-bubble"
                onClick={() => handleHistoryTap(historyItem.itemId)}
                role="button"
                aria-label="この質問に戻る"
              >
                <div className="history-bubble-header">
                  <span>Q{hIndex}.</span>
                  <span className={`history-result ${historyItem.answer}`}>
                    {historyItem.answer === "yes" ? "✅ はい" : "❌ いいえ"}
                  </span>
                </div>
                <div className="history-bubble-text">{historyItem.question}</div>
                <div className="history-undo-hint">↩ ここに戻って修正</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 質問カード */}
      <div className="check-content">
        <div className="question-card main-question focus-animation" key={animKey}>
          <div className="question-number">
            Q{currentIndex + 1} / {TOTAL_ITEMS}
          </div>
          <h2 className="question-text">{currentItem.question}</h2>

          {/* 備考（常時表示エリア） */}
          {currentItem.note && (
            <div className="note-card always-open">
              <div className="note-card-title">💡 補足と注意</div>
              {/* 改行を<br>に変換して表示 */}
              <div className="note-card-content">
                {currentItem.note.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 回答ボタンエリア */}
      <div className="answer-area">
        <div className="answer-buttons">
          <button
            className="answer-btn answer-btn-yes"
            onClick={() => handleAnswer("yes")}
            id="btn-answer-yes"
          >
            ⭕ はい
          </button>
          <button
            className="answer-btn answer-btn-no"
            onClick={() => handleAnswer("no")}
            id="btn-answer-no"
          >
            ✕ いいえ
          </button>
        </div>

        {/* 戻るボタン */}
        {currentIndex > 0 && (
          <div className="back-button">
            <button
              className="btn btn-ghost btn-sm btn-block"
              onClick={handleBack}
              id="btn-prev-question"
            >
              ← 前の質問に戻る
            </button>
          </div>
        )}
      </div>

      {/* 中断確認ダイアログ */}
      {showExitConfirm && (
        <div className="modal-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">チェックを中断しますか？</h2>
            <p className="modal-message">
              現在の進捗は自動的に保存されます。
              <br />
              後からトップ画面で続きから再開できます。
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowExitConfirm(false)}
              >
                続ける
              </button>
              <button className="btn btn-warning btn-sm" onClick={handleExit}>
                中断する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
