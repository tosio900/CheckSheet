import { createContext, useReducer, useState, useEffect, useCallback, useMemo } from "react";
import {
  saveCheckSession,
  loadCheckSession,
  clearCheckSession,
  generateCheckId,
  saveSessionToHistory,
} from "../utils/storage";
import { useTemplates } from "./TemplateContext";
import { SESSION_STATUS } from "../constants/session";
import * as sessionLogic from "../domain/sessionLogic";
import { deleteImage as deleteImageFromDb } from "../utils/imageDb";
import logger from "../utils/logger";

const CheckSessionContext = createContext(null);

const initialState = {
  session: null,
  resumeSession: null,
  isLoaded: false,
  saveError: null,
  syncWarning: null,
};

function sessionReducer(state, action) {
  switch (action.type) {
    case "LOAD_STORAGE":
      return {
        ...state,
        resumeSession: action.payload,
        isLoaded: true,
      };
    case "START_NEW":
      return {
        ...state,
        session: action.payload,
        resumeSession: null,
      };
    case "RESUME":
      return {
        ...state,
        session: state.resumeSession,
      };
    case "ANSWER_QUESTION": {
      const { item, answer, inputs, totalItems } = action.payload;
      const newAnswer = sessionLogic.createAnswerObject(item, answer, inputs);
      const updatedAnswers = sessionLogic.updateAnswersList(state.session.answers, newAnswer);
      
      // 回答が確定した項目のドラフトを削除
      const updatedDrafts = { ...(state.session.draftInputs || {}) };
      delete updatedDrafts[item.id];

      const isComplete = sessionLogic.isSessionCompleted(updatedAnswers, totalItems);
      const isInitialCompletion = isComplete && state.session.status !== SESSION_STATUS.COMPLETED;

      if (isInitialCompletion) {
        return {
          ...state,
          session: {
            ...state.session,
            answers: updatedAnswers,
            draftInputs: updatedDrafts,
            currentIndex: totalItems - 1,
            status: SESSION_STATUS.COMPLETED,
            completedAt: new Date().toISOString(),
          }
        };
      }

      return {
        ...state,
        session: {
          ...state.session,
          answers: updatedAnswers,
          draftInputs: updatedDrafts,
          currentIndex: sessionLogic.calculateNextIndex(state.session.currentIndex, totalItems),
        }
      };
    }
    case "UPDATE_DRAFT": {
      const { itemId, inputs } = action.payload;
      return {
        ...state,
        session: {
          ...state.session,
          draftInputs: {
            ...(state.session.draftInputs || {}),
            [itemId]: inputs
          }
        }
      };
    }
    case "GO_TO_INDEX":
      return {
        ...state,
        session: { ...state.session, currentIndex: action.payload }
      };
    case "UPDATE_MEMO":
      return {
        ...state,
        session: { ...state.session, memo: action.payload }
      };
    case "ADD_IMAGE": {
      const { itemId, imageId } = action.payload;
      const updatedImages = sessionLogic.addImageToSession(
        state.session.images || {},
        itemId,
        imageId
      );
      return {
        ...state,
        session: { ...state.session, images: updatedImages },
      };
    }
    case "REMOVE_IMAGE": {
      const { itemId: rmItemId, imageId: rmImageId } = action.payload;
      const cleanedImages = sessionLogic.removeImageFromSession(
        state.session.images || {},
        rmItemId,
        rmImageId
      );
      return {
        ...state,
        session: { ...state.session, images: cleanedImages },
      };
    }
    case "COMPLETE_SESSION":
      return {
        ...state,
        session: {
          ...state.session,
          ...action.payload,
          status: SESSION_STATUS.COMPLETED,
          completedAt: new Date().toISOString()
        }
      };
    case "SET_SYNC_WARNING":
      return {
        ...state,
        syncWarning: action.payload,
      };
    case "RESET":
      return {
        ...state,
        session: null,
        resumeSession: null,
      };
    case "SET_RESUME":
      return {
        ...state,
        resumeSession: action.payload,
      };
    default:
      return state;
  }
}

export function CheckSessionProvider({ children }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  const [saveError, setSaveError] = useState(null);
  const { templateInfo, activeTemplate } = useTemplates();
  const TOTAL_ITEMS = templateInfo.totalCount;

  // 初回読み込み
  useEffect(() => {
    try {
      const saved = loadCheckSession();
      if (saved && saved.status === SESSION_STATUS.IN_PROGRESS) {
        dispatch({ type: "LOAD_STORAGE", payload: saved });
      } else {
        dispatch({ type: "LOAD_STORAGE", payload: null });
      }
    } catch (err) {
      logger.error("Failed to load session from storage", err);
      dispatch({ type: "LOAD_STORAGE", payload: null });
    }
  }, []);

  // セッションが更新されるたびに自動保存
  useEffect(() => {
    if (state.session) {
      try {
        const success = saveCheckSession(state.session);
        if (!success) {
          logger.warn("Session auto-save returned false (possible quota exceeded)");
          setSaveError("データの保存に失敗しました。ストレージ容量が不足している可能性があります。");
        } else {
          if (saveError) setSaveError(null);
          if (state.session.status === SESSION_STATUS.COMPLETED) {
            try {
              saveSessionToHistory(state.session);
            } catch (histErr) {
              logger.error("Failed to save session to history", histErr);
            }
          }
        }
      } catch (err) {
        logger.error("Failed to save session auto-sync", err);
        setSaveError("データの保存中にエラーが発生しました。");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.session]);

  const startNewSession = useCallback(({ siteName, inspector, memo }) => {
    const newSession = {
      checkId: generateCheckId(),
      templateId: activeTemplate?.id || "default", // 使用したテンプレートIDを記録
      siteName,
      inspector,
      memo: memo || "",
      startedAt: new Date().toISOString(),
      completedAt: null,
      status: SESSION_STATUS.IN_PROGRESS,
      currentIndex: 0,
      answers: [],
      draftInputs: {},
      images: {},
      gps: null,
    };
    clearCheckSession();
    dispatch({ type: "START_NEW", payload: newSession });
    return newSession;
  }, [activeTemplate]);

  const resumeActiveSession = useCallback(() => {
    dispatch({ type: "RESUME" });
  }, []);

  const updateAnswer = useCallback((item, answer, inputs) => {
    dispatch({ 
        type: "ANSWER_QUESTION", 
        payload: { item, answer, inputs, totalItems: TOTAL_ITEMS } 
    });
  }, [TOTAL_ITEMS]);

  const goToIndex = useCallback((index) => {
    dispatch({ type: "GO_TO_INDEX", payload: index });
  }, []);

  const updateMemo = useCallback((memo) => {
    dispatch({ type: "UPDATE_MEMO", payload: memo });
  }, []);

  const addImage = useCallback((itemId, imageId) => {
    dispatch({ type: "ADD_IMAGE", payload: { itemId, imageId } });
  }, []);

  const removeImage = useCallback(async (itemId, imageId) => {
    await deleteImageFromDb(imageId);
    dispatch({ type: "REMOVE_IMAGE", payload: { itemId, imageId } });
  }, []);

  const updateDraft = useCallback((itemId, inputs) => {
    dispatch({ type: "UPDATE_DRAFT", payload: { itemId, inputs } });
  }, []);

  const completeSession = useCallback((finalSessionUpdates = {}) => {
    dispatch({ type: "COMPLETE_SESSION", payload: finalSessionUpdates });
  }, []);

  const resetAll = useCallback(() => {
    clearCheckSession();
    dispatch({ type: "RESET" });
  }, []);

  const refreshResumeSession = useCallback(() => {
    const saved = loadCheckSession();
    if (saved && saved.status === SESSION_STATUS.IN_PROGRESS) {
      dispatch({ type: "SET_RESUME", payload: saved });
    } else {
      dispatch({ type: "SET_RESUME", payload: null });
    }
  }, []);

  const { yesCount, noCount } = useMemo(() => 
    sessionLogic.calculateSummary(state.session?.answers || []), 
    [state.session?.answers]
  );

  const clearSaveError = useCallback(() => setSaveError(null), []);
  const clearSyncWarning = useCallback(() => dispatch({ type: "SET_SYNC_WARNING", payload: null }), []);

  const value = {
    session: state.session,
    resumeSession: state.resumeSession,
    isLoaded: state.isLoaded,
    saveError,
    syncWarning: state.syncWarning,
    clearSaveError,
    clearSyncWarning,
    yesCount,
    noCount,
    totalCount: TOTAL_ITEMS, // 動的な項目数を提供
    startNewSession,
    resumeActiveSession,
    updateAnswer,
    goToIndex,
    updateMemo,
    addImage,
    removeImage,
    completeSession,
    updateDraft,
    resetAll,
    refreshResumeSession
  };

  return (
    <CheckSessionContext.Provider value={value}>
      {children}
    </CheckSessionContext.Provider>
  );
}

export { CheckSessionContext };
