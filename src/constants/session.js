/**
 * セッション管理に関連する定数定義
 */

export const SESSION_STATUS = {
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
};

export const STORAGE_KEYS = {
  SESSION: "survey_check_session",
  USER_PROFILE: "survey_user_profile",
};

export const DEFAULT_SESSION = {
  currentIndex: 0,
  answers: [],
  memo: "",
};
