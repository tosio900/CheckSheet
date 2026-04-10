import { useState, useEffect, useMemo } from "react";
import { getAllItems, TOTAL_ITEMS } from "../data/checkItems";
import { useCheckSession } from "../hooks/useCheckSession";
import ProgressHeader from "./check/ProgressHeader";
import QuestionCard from "./check/QuestionCard";
import AnswerControls from "./check/AnswerControls";
import MatrixView from "./check/MatrixView";
import logger from "../utils/logger";

/**
 * チェック実行画面（メインチェック画面）
 */
export default function ChatCheck({ onComplete, onExit }) {
  const allItems = getAllItems();
  const { 
    session, 
    updateAnswer, 
    goToIndex 
  } = useCheckSession();

  const [currentInputs, setCurrentInputs] = useState({});
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const currentIndex = session.currentIndex;
  const answers = session.answers;
  const progress = answers.length;
  const percentage = Math.round((progress / TOTAL_ITEMS) * 100);

  const currentItem = allItems[currentIndex];

  const [prevId, setPrevId] = useState(currentItem?.id);

  // currentItemが変わった際に入力値を同期する (cascading renderを避けるためレンダリング中に実行)
  if (currentItem && currentItem.id !== prevId) {
    setPrevId(currentItem.id);
    const existing = answers.find(a => a.itemId === currentItem.id);
    setCurrentInputs(existing?.inputs || {});
    setAnimKey(prev => prev + 1);
    logger.debug("Current item changed (Reset state)", { 
      index: currentIndex, 
      id: currentItem.id, 
      hasExistingAnswer: !!existing 
    });
  }

  const handleHandleAnswer = (answer) => {
    // 振動フィードバック
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    updateAnswer(currentItem, answer, currentInputs);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      goToIndex(currentIndex - 1);
    }
  };

  const handleJumpTo = (index) => {
    goToIndex(index);
  };

  // バリデーション計算をメモ化
  const isInputIncomplete = useMemo(() => {
    if (!currentItem?.inputs) return false;
    return currentItem.inputs.some(
      label => !currentInputs[label] || currentInputs[label].trim() === ""
    );
  }, [currentItem, currentInputs]);

  return (
    <div className="check-screen">
      <ProgressHeader 
        currentItem={currentItem}
        progress={progress}
        percentage={percentage}
        onExit={() => setShowExitConfirm(true)}
      />

      <MatrixView 
        allItems={allItems}
        currentIndex={currentIndex}
        answers={answers}
        onJumpTo={handleJumpTo}
      />

      {currentIndex < TOTAL_ITEMS && currentItem ? (
        <div className="check-body fixed-layout-body">
            <QuestionCard 
                currentItem={currentItem}
                currentIndex={currentIndex}
                totalItems={TOTAL_ITEMS}
                animKey={animKey}
                currentInputs={currentInputs}
                onInputChange={(label, value) => setCurrentInputs(prev => ({ ...prev, [label]: value }))}
            />

            <AnswerControls 
                currentIndex={currentIndex}
                isInputIncomplete={isInputIncomplete}
                onAnswer={handleHandleAnswer}
                onBack={handleBack}
                onComplete={() => onComplete(session)}
                showCompleteBtn={answers.length === TOTAL_ITEMS}
            />
        </div>
      ) : null}

      {/* 中断確認ダイアログ */}
      {showExitConfirm && (
        <div className="modal-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">チェックを中断しますか？</h2>
            <p className="modal-message">
              現在の進捗は自動的に保存されます。<br />
              後からトップ画面で続きから再開できます。
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowExitConfirm(false)}>続ける</button>
              <button className="btn btn-warning btn-sm" onClick={onExit}>中断する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
