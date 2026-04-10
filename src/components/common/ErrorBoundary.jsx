import React from "react";
import logger from "../../utils/logger";

/**
 * アプリケーション全体の予期せぬエラーを捕捉する境界コンポーネント
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // 次のレンダリングでフォールバックUIを表示
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // エラーロギング
    logger.error("ErrorBoundary caught an error", error, { errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = import.meta.env.BASE_URL || "/";
  };

  render() {
    if (this.state.hasError) {
      // フォールバックUIの表示
      return (
        <div className="error-fallback">
          <div className="error-fallback-content">
            <div className="error-icon">⚠️</div>
            <h1 className="error-title">申し訳ありません</h1>
            <p className="error-message">
              予期せぬエラーが発生しました。<br />
              データの整合性を保つため、一度ホームに戻ることをお勧めします。
            </p>
            <div className="error-actions">
              <button 
                className="btn btn-primary btn-block" 
                onClick={this.handleReset}
              >
                ホームに戻る
              </button>
            </div>
            {import.meta.env.DEV && (
               <details className="error-details">
                 <summary>詳細情報 (開発者用)</summary>
                 <pre>{this.state.error?.toString()}</pre>
               </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
