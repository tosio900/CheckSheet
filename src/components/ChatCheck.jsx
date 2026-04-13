import { useState } from "react";
import { getAllItems, TOTAL_ITEMS } from "../data/checkItems";
import { useCheckSession } from "../hooks/useCheckSession";
import ProgressHeader from "./check/ProgressHeader";
import QuestionCard from "./check/QuestionCard";
import AnswerControls from "./check/AnswerControls";
import MatrixView from "./check/MatrixView";
import ConfirmModal from "./common/ConfirmModal";
import { getItemImageIds } from "../domain/sessionLogic";
import logger from "../utils/logger";
import styles from "./ChatCheck.module.css";

/**
 * チェック実行画面（メインチェック画面）
 */
export default function ChatCheck({ onComplete, onExit, isEditingAfterComplete }) {
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
  const [lastAnsweredItemId, setLastAnsweredItemId] = useState(null);
  const [prevItemId, setPrevItemId] = useState(null);

  const currentIndex = session.currentIndex;
  const answers = session.answers;
  const progress = answers.length;
  const percentage = Math.round((progress / TOTAL_ITEMS) * 100);

  const currentItem = allItems[currentIndex];

  // currentItem が変わった際に入力値を同期する (レンダリング中の状態調整パターン)
  if (currentItem && currentItem.id !== prevItemId) {
    const isSameItemAsLastAnswer = lastAnsweredItemId === currentItem.id;
    
    if (!isSameItemAsLastAnswer) {
      // 別の項目に移動した場合はフラグをクリア
      setLastAnsweredItemId(null);
      
      const existing = answerMap.get(currentItem.id);
      setCurrentInputs(existing?.inputs || {});
      setAnimKey(prev => prev + 1);
    } else if (isEditingAfterComplete) {
      // 完了後の編集モードで、回答直後にその項目に留まっている場合は次回移動のために解除
      setLastAnsweredItemId(null);
    }

    setPrevItemId(currentItem.id);
  }

  const handleAnswer = (answer) => {
    if (!currentItem) return;

    // 振動フィードバック
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    
    // 入力が不完全な場合は進ませない（ガード）
    if (answer === "yes" && isInputIncomplete) return;

    setLastAnsweredItemId(currentItem.id);
    updateAnswer(currentItem, answer, currentInputs);

    // 最後の質問への回答かつ初回セッションの場合、自動的に完了させる
    const isAlreadyAnswered = session.answers.some(a => a.id === currentItem.id);
    const totalAnsweredCount = session.answers.length + (isAlreadyAnswered ? 0 : 1);

    if (totalAnsweredCount >= TOTAL_ITEMS && !isEditingAfterComplete) {
      logger.info("Auto-completing session after last answer", { totalAnsweredCount });
      onComplete(session);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      goToIndex(currentIndex - 1);
    }
  };

  const handleJumpTo = (index) => {
    goToIndex(index);
  };

  // バリデーション計算（入力値が未入力の間は「はい」を押せないようにする判定）
  const isInputIncomplete = currentItem?.inputs 
    ? currentItem.inputs.some(label => !currentInputs[label] || currentInputs[label].trim() === "")
    : false;

  // 現在の項目に紐づく画像IDリスト
  const currentImageIds = currentItem 
    ? getItemImageIds(session.images, currentItem.id) 
    : [];

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
        <>
          <div className={`${styles["check-content"]} ${styles["fixed-layout"]}`}>
              <QuestionCard 
                  currentItem={currentItem}
                  currentIndex={currentIndex}
                  totalItems={TOTAL_ITEMS}
                  animKey={animKey}
                  currentInputs={currentInputs}
                  onInputChange={(label, value) => setCurrentInputs(prev => ({ ...prev, [label]: value }))}
                  imageIds={currentImageIds}
              />
          </div>

          <AnswerControls 
              currentIndex={currentIndex}
              isInputIncomplete={isInputIncomplete}
              onAnswer={handleAnswer}
              onBack={handleBack}
              onComplete={() => onComplete(session)}
              showCompleteBtn={answers.length === TOTAL_ITEMS}
          />
        </>
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
