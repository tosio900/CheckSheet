/**
 * 統合ロギングユーティリティ
 * 環境に応じてログレベルを制御し、エラー追跡を容易にする
 */

const isDev = import.meta.env.DEV;

const logger = {
  debug: (...args) => {
    if (isDev) {
      console.log("[DEBUG]", ...args);
    }
  },
  
  info: (...args) => {
    console.log("[INFO]", ...args);
  },
  
  warn: (...args) => {
    console.warn("[WARN]", ...args);
  },
  
  error: (message, error = null, context = {}) => {
    console.error(`[ERROR] ${message}`, {
      error,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
    
    // 将来的にSentryなどの外部サービスと連携する場合はここに記述
  }
};

export default logger;
