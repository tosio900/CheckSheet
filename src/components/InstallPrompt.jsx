import { useState } from "react";
import { Smartphone, Share, PlusSquare, ArrowDown } from "lucide-react";
import styles from "./InstallPrompt.module.css";

/**
 * iOS Safari向けのインストール（ホーム画面に追加）ガイドUI
 * 現場の人が迷わずPWAをインストールできるようにするためのオーバーレイ
 */
export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;

    // 最新のiOS/iPadOS判定 (iPadのデスクトップモード含む)
    const isIOS = 
      /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.userAgent.includes("Mac") && "ontouchend" in document);

    // PWA判定
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    // Safari判定 (Chrome/EdgeなどのサードパーティブラウザはCriOS/EdgiOSなどを含む)
    const isSafari = isIOS && /WebKit/i.test(navigator.userAgent) && !/CriOS|EdgiOS|OPiOS|FxiOS|Focus/i.test(navigator.userAgent);
    
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
    <div className={styles["install-prompt-overlay"]}>
      <div className={styles["install-prompt-content"]}>
        <h2 style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Smartphone size={24} style={{ marginRight: 8 }} /> アプリをホーム画面に追加
        </h2>
        <p>
          オフラインの測量現場でも使えるように、<br />
          このアプリをインストールしてください！
        </p>

        <div className={styles["install-steps"]}>
          <div className={styles["install-step"]}>
            <span className={styles["step-number"]}>1</span>
            <span>画面下部の「共有」ボタン <Share size={16} style={{ verticalAlign: "middle", margin: "0 2px" }} /> をタップ</span>
          </div>
          <div className={styles["install-step"]}>
            <span className={styles["step-number"]}>2</span>
            <span>少し下にスクロールして<br/><strong>「ホーム画面に追加 <PlusSquare size={16} style={{ verticalAlign: "middle", margin: "0 2px" }} />」</strong>を選択</span>
          </div>
        </div>

        <button className="btn btn-primary btn-block btn-lg" onClick={dismissPrompt}>
          確認した
        </button>
      </div>

      <div className={styles["install-arrow"]}><ArrowDown size={32} /></div>
    </div>
  );
}
