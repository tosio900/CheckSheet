import { useState, useCallback, useRef, useEffect } from "react";
import { getAllItems, TOTAL_ITEMS } from "../data/checkItems";
import { saveCheckSession } from "../utils/storage";
import { CheckCircle, XCircle, X, ChevronLeft, Check } from "lucide-react";

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

  const matrixScrollRef = useRef(null);

  const currentItem = allItems[currentIndex];
  const progress = answers.length;
  const percentage = Math.round((progress / TOTAL_ITEMS) * 100);

  /**
   * カレントの問題番号が変わるたびにマトリックスを自動スクロール
   */
  useEffect(() => {
    if (matrixScrollRef.current) {
      const activeElement = matrixScrollRef.current.querySelector(".active-col");
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [currentIndex]);

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
    },
    [session]
  );

  /**
   * 回答を処理
   */
  const handleAnswer = (answer) => {
    const newAnswer = {
      categoryId: currentItem.categoryId,
      itemId: currentItem.id,
      question: currentItem.question,
      answer,
      answeredAt: new Date().toISOString(),
    };

    // 振動フィードバック
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }

    // 既存の回答を上書きまたは追加
    const updatedAnswers = [...answers];
    const existingIdx = updatedAnswers.findIndex((a) => a.itemId === currentItem.id);
    if (existingIdx >= 0) {
      updatedAnswers[existingIdx] = newAnswer;
    } else {
      updatedAnswers.push(newAnswer);
    }

    setAnswers(updatedAnswers);

    const nextIndex = currentIndex + 1;

    if (nextIndex >= allItems.length) {
      // 全項目完了
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
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setAnimKey((prev) => prev + 1);
      autoSave(answers, prevIndex);
    }
  };

  /**
   * 特定の過去の質問に戻る (Undo / マトリックスから飛ぶ)
   */
  const handleHistoryTap = (targetIndex) => {
    if (targetIndex >= 0 && targetIndex < currentIndex) {
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

  if (!currentItem) return null;

  return (
    <div className="check-screen">
      {/* ヘッダー */}
      <div className="check-header fixed-header">
        <div className="check-header-top">
          <span className="check-header-title">測量前チェック</span>
          <button
            className="check-header-close"
            onClick={() => setShowExitConfirm(true)}
            aria-label="中断して閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* プログレスバー */}
        <div className="progress-container">
          <div className="progress-info">
            <span className="progress-category">{currentItem.categoryName}</span>
            <span className="progress-count">
              {progress}/{TOTAL_ITEMS} ({percentage}%)
            </span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${percentage}%` }}
              role="progressbar"
            />
          </div>
        </div>

        {/* 回答マトリックス (履歴の代わり) */}
        <div className="answer-matrix" ref={matrixScrollRef}>
          <table className="matrix-table">
            <thead>
              <tr>
                {allItems.map((_, i) => (
                  <th key={i} className={currentIndex === i ? "active-col" : ""}>
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {allItems.map((item, i) => {
                  const ans = answers.find(a => a.itemId === item.id);
                  const canUndo = i < currentIndex && ans;
                  return (
                    <td 
                      key={i} 
                      className={`${ans ? ans.answer : ""} ${canUndo ? "clickable" : ""} ${currentIndex === i ? "active-col" : ""}`}
                      onClick={() => canUndo && handleHistoryTap(i)}
                    >
                      {ans?.answer === "yes" ? <Check size={16} strokeWidth={4} /> : ans?.answer === "no" ? <X size={16} strokeWidth={4} /> : "-"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
          <div className="matrix-hint">※回答済みの番号をタップすると修正できます</div>
        </div>
      </div>

      {/* 質問カード (スクロールせず固定されるエリア) */}
      <div className="check-content fixed-layout">
        <div className="question-card main-question focus-animation" key={animKey}>
          <div className="question-number">
            Q{currentIndex + 1} / {TOTAL_ITEMS}
          </div>
          <h2 className="question-text">{currentItem.question}</h2>

          {/* 備考（常時表示エリア） */}
          {currentItem.note && (
            <div className="note-card always-open">
              <div className="note-card-title">💡 補足と注意</div>
              <div className="note-card-content">
                {currentItem.note.split('\n').map((line, idx) => (
                  <span key={idx}>
                    {line}
                    <br />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 回答ボタンエリア (常に画面下部に固定) */}
      <div className="answer-area fixed-bottom">
        <div className="answer-buttons">
          <button
            className="answer-btn answer-btn-yes"
            onClick={() => handleAnswer("yes")}
          >
            <CheckCircle size={28} /> はい
          </button>
          <button
            className="answer-btn answer-btn-no"
            onClick={() => handleAnswer("no")}
          >
            <XCircle size={28} /> いいえ
          </button>
        </div>

        {/* 戻るボタン（または高さ調整のプレースホルダー） */}
        <div className="back-button-container">
          {currentIndex > 0 ? (
            <button
              className="btn btn-ghost btn-sm btn-block back-btn-with-icon"
              onClick={handleBack}
            >
              <ChevronLeft size={16} /> 前の質問に戻る
            </button>
          ) : (
            <div className="back-button-placeholder" />
          )}
        </div>
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
