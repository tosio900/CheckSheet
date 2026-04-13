import { useState, useEffect, useMemo, useRef } from "react";
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
  const lastAnsweredItemRef = useRef(null);

  const currentIndex = session.currentIndex;
  const answers = session.answers;
  const progress = answers.length;
  const percentage = Math.round((progress / TOTAL_ITEMS) * 100);

  const currentItem = allItems[currentIndex];

  // currentItem または answerMap が変わった際に入力値を同期する
  useEffect(() => {
    if (currentItem) {
      const isSameItemAsLastAnswser = lastAnsweredItemRef.current === currentItem.id;
      
      if (isSameItemAsLastAnswser) {
        // 回答直後かつ同じ項目（最後の質問など）に留まっている場合
        // 初回完了時は onComplete 側でクリアされる
        // 修正モード時はここでクリアしても良いが、一貫性のためここで一旦残すか、
        // 修正モード中なら即座にクリアする
        if (isEditingAfterComplete) {
          lastAnsweredItemRef.current = null;
        }
        return;
      }
      
      // 別の項目に移動した場合はフラグをクリア
      lastAnsweredItemRef.current = null;
      
      const existing = answerMap.get(currentItem.id);
      setCurrentInputs(existing?.inputs || {});
      setAnimKey(prev => prev + 1);
    }
  }, [currentItem?.id, answerMap, isEditingAfterComplete]);

  // #04: 最後の質問または編集中に全回答完了した場合、瞬時に結果画面に遷移する
  //     ただし、結果画面から編集に戻った場合は、手動ボタンでのみ遷移させる
  useEffect(() => {
    if (session?.answers?.length >= TOTAL_ITEMS && lastAnsweredItemRef.current && !isEditingAfterComplete) {
      const answeredId = lastAnsweredItemRef.current;
      lastAnsweredItemRef.current = null; // ここでクリア
      logger.info("Auto-completing initial session", { lastItem: answeredId });
      onComplete(session);
    }
  }, [session, onComplete, isEditingAfterComplete]);

  const handleAnswer = (answer) => {
    // 振動フィードバック
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    
    // 入力が不完全な場合は進ませない（ガード）
    if (answer === "yes" && isInputIncomplete) return;

    lastAnsweredItemRef.current = currentItem.id;
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
