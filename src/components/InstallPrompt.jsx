import { useState, useEffect } from "react";

/**
 * iOS Safari向けのインストール（ホーム画面に追加）ガイドUI
 * 現場の人が迷わずPWAをインストールできるようにするためのオーバーレイ
 */
export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(() => {
    // iOSデバイス判定
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    // PWA判定
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    // Safari判定
    const isSafari = isIOS && /WebKit/i.test(navigator.userAgent) && !/CriOS/i.test(navigator.userAgent);
    
    // session storage
    if (typeof window !== "undefined") {
      const hasSeenPrompt = sessionStorage.getItem("hasSeenInstallPrompt");
      return isIOS && isSafari && !isStandalone && !hasSeenPrompt;
    }
    return false;
  });

  const dismissPrompt = () => {
    sessionStorage.setItem("hasSeenInstallPrompt", "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="install-prompt-overlay">
      <div className="install-prompt-content">
        <h2>📱 アプリをホーム画面に追加</h2>
        <p>
          オフラインの測量現場でも使えるように、<br />
          このアプリをインストールしてください！
        </p>

        <div className="install-steps">
          <div className="install-step">
            <span className="step-number">1</span>
            <span>画面下部の「共有」ボタン <strong>[↑]</strong> をタップ</span>
          </div>
          <div className="install-step">
            <span className="step-number">2</span>
            <span>少し下にスクロールして<br/><strong>「ホーム画面に追加 ＋」</strong>を選択</span>
          </div>
        </div>

        <button className="btn btn-primary btn-block btn-lg" onClick={dismissPrompt}>
          確認した
        </button>
      </div>

      <div className="install-arrow">↓</div>
    </div>
  );
}
