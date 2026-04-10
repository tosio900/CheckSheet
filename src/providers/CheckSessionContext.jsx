import { createContext, useReducer, useEffect, useCallback, useMemo } from "react";
import {
  saveCheckSession,
  loadCheckSession,
  clearCheckSession,
  generateCheckId,
} from "../utils/storage";
import { TOTAL_ITEMS } from "../data/checkItems";
import { SESSION_STATUS } from "../constants/session";
import * as sessionLogic from "../domain/sessionLogic";
import logger from "../utils/logger";

const CheckSessionContext = createContext(null);

const initialState = {
  session: null,
  resumeSession: null,
  isLoaded: false,
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
      const { item, answer, inputs } = action.payload;
      const newAnswer = sessionLogic.createAnswerObject(item, answer, inputs);
      const updatedAnswers = sessionLogic.updateAnswersList(state.session.answers, newAnswer);
      
      const isComplete = sessionLogic.isSessionCompleted(updatedAnswers, TOTAL_ITEMS);
      
      if (isComplete) {
        return {
          ...state,
          session: {
            ...state.session,
            answers: updatedAnswers,
            currentIndex: TOTAL_ITEMS - 1,
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
          currentIndex: sessionLogic.calculateNextIndex(state.session.currentIndex, TOTAL_ITEMS),
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

  // セッションが更新されるたびにLocalStorageに保存
  // 完了後のメモ編集やPDF出力前のデータ保全のため、ステータスに関わらず保存する
  useEffect(() => {
    if (state.session) {
      try {
        saveCheckSession(state.session);
      } catch (err) {
        logger.error("Failed to save session auto-sync", err);
      }
    }
  }, [state.session]);

  const startNewSession = useCallback(({ siteName, inspector, memo }) => {
    const newSession = {
      checkId: generateCheckId(),
      siteName,
      inspector,
      memo: memo || "",
      startedAt: new Date().toISOString(),
      completedAt: null,
      status: SESSION_STATUS.IN_PROGRESS,
      currentIndex: 0,
      answers: [],
    };
    clearCheckSession();
    dispatch({ type: "START_NEW", payload: newSession });
    return newSession;
  }, []);

  const resumeActiveSession = useCallback(() => {
    dispatch({ type: "RESUME" });
  }, []);

  const updateAnswer = useCallback((item, answer, inputs) => {
    dispatch({ type: "ANSWER_QUESTION", payload: { item, answer, inputs } });
  }, []);

  const goToIndex = useCallback((index) => {
    dispatch({ type: "GO_TO_INDEX", payload: index });
  }, []);

  const updateMemo = useCallback((memo) => {
    dispatch({ type: "UPDATE_MEMO", payload: memo });
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

  const value = {
    session: state.session,
    resumeSession: state.resumeSession,
    isLoaded: state.isLoaded,
    yesCount,
    noCount,
    startNewSession,
    resumeActiveSession,
    updateAnswer,
    goToIndex,
    updateMemo,
    completeSession,
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
