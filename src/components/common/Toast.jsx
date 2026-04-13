import { useState, useEffect } from "react";

/**
 * 簡易Toast通知コンポーネント
 * LocalStorage保存失敗やPDF出力結果等のフィードバックに使用
 */
export default function Toast({ message, type = "info", duration = 4000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300); // フェードアウト後にコールバック
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeStyles = {
    info: { background: "var(--color-primary)", color: "#fff" },
    success: { background: "var(--color-success)", color: "#fff" },
    warning: { background: "#f59e0b", color: "#fff" },
    error: { background: "var(--color-danger)", color: "#fff" },
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "calc(var(--space-6) + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0" : "20px"})`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease, transform 0.3s ease",
        padding: "var(--space-3) var(--space-5)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        fontSize: "var(--font-size-sm)",
        fontWeight: "var(--font-weight-medium)",
        zIndex: 9999,
        maxWidth: "90vw",
        textAlign: "center",
        ...typeStyles[type],
      }}
    >
      {message}
    </div>
  );
}
