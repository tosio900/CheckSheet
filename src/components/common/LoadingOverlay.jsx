import styles from "./LoadingOverlay.module.css";

/**
 * 画面全体を覆うローディングオーバーレイ
 */
export default function LoadingOverlay({ message = "処理中..." }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.spinner} />
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
}
