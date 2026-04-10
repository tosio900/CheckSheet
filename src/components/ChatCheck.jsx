import { useState, useEffect, useMemo } from "react";
import { getAllItems, TOTAL_ITEMS } from "../data/checkItems";
import { useCheckSession } from "../hooks/useCheckSession";
import ProgressHeader from "./check/ProgressHeader";
import QuestionCard from "./check/QuestionCard";
import AnswerControls from "./check/AnswerControls";
import MatrixView from "./check/MatrixView";
import ConfirmModal from "./common/ConfirmModal";
import logger from "../utils/logger";
import styles from "./ChatCheck.module.css";

/**
 * チェック実行画面（メインチェック画面）
 */
export default function ChatCheck({ onComplete, onExit }) {
  const allItems = getAllItems();
  const { 
    session, 
    updateAnswer, 
    goToIndex,
    answerMap
  } = useCheckSession();

  const [currentInputs, setCurrentInputs] = useState({});
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const currentIndex = session.currentIndex;
  const answers = session.answers;
  const progress = answers.length;
  const percentage = Math.round((progress / TOTAL_ITEMS) * 100);

  const currentItem = allItems[currentIndex];

  // currentItem が変わった際に入力値を同期する
  // eslint-disable-next-line react-hooks/exhaustive-deps -- answerMap を依存に含めると回答のたびにリセットされるため意図的に除外
  useEffect(() => {
    if (currentItem) {
      const existing = answerMap.get(currentItem.id);
      setCurrentInputs(existing?.inputs || {});
      setAnimKey(prev => prev + 1);
      logger.debug("Current item changed (Reset state)", { 
        index: currentIndex, 
        id: currentItem.id, 
        hasExistingAnswer: !!existing 
      });
    }
  }, [currentItem?.id]);

  const handleAnswer = (answer) => {
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
    <div className={styles["check-screen"]}>
      <ProgressHeader 
        currentItem={currentItem}
        progress={progress}
        percentage={percentage}
        onExit={() => setShowExitConfirm(true)}
      />

      <MatrixView 
        allItems={allItems}
        currentIndex={currentIndex}
        answerMap={answerMap}
        onJumpTo={handleJumpTo}
      />

      {currentIndex < TOTAL_ITEMS && currentItem ? (
        <div className={`${styles["check-content"]} ${styles["fixed-layout"]}`}>
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
                onAnswer={handleAnswer}
                onBack={handleBack}
                onComplete={() => onComplete(session)}
                showCompleteBtn={answers.length === TOTAL_ITEMS}
            />
        </div>
      ) : null}

      {/* 中断確認ダイアログ */}
      {showExitConfirm && (
        <ConfirmModal
          title="チェックを中断しますか？"
          message={
            <>
              現在の進捗は自動的に保存されます。<br />
              後からトップ画面で続きから再開できます。
            </>
          }
          confirmLabel="中断する"
          confirmVariant="warning"
          onConfirm={onExit}
          onCancel={() => setShowExitConfirm(false)}
        />
      )}
    </div>
  );
}
