import { useRef, useEffect, useState, useCallback } from "react";
import { Undo2, Save, X, Pen } from "lucide-react";
import styles from "./ImageAnnotator.module.css";
import logger from "../../utils/logger";

/**
 * 画像注釈エディタ（フルスクリーンモーダル）
 *
 * Pointer Events API を使用し、マウス（PC）、指（iPhone）、
 * Apple Pencil（iPad）のすべてで統一的な描画体験を提供する。
 *
 * @param {Blob} imageBlob - 注釈対象の画像Blob
 * @param {function} onSave - 注釈付き画像の Canvas を返すコールバック
 * @param {function} onCancel - キャンセル時のコールバック
 */
export default function ImageAnnotator({ imageBlob, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawHistory, setDrawHistory] = useState([]);
  const [isDrawMode, setIsDrawMode] = useState(true);
  const imageDataRef = useRef(null); // 元画像のImageDataキャッシュ

  // 描画設定（赤ペン固定）
  const PEN_COLOR = "#ef4444";
  const PEN_WIDTH = 3;

  /**
   * Canvas に画像を描画する
   */
  useEffect(() => {
    if (!imageBlob || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const url = URL.createObjectURL(imageBlob);
    const img = new Image();

    img.onload = () => {
      // Canvas サイズを画像に合わせる（コンテナ幅を超えないように）
      const container = canvas.parentElement;
      const maxWidth = container.clientWidth;
      const maxHeight = container.clientHeight;

      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      const drawWidth = Math.round(img.width * ratio);
      const drawHeight = Math.round(img.height * ratio);

      canvas.width = drawWidth;
      canvas.height = drawHeight;
      ctx.drawImage(img, 0, 0, drawWidth, drawHeight);

      // 元画像のImageDataを保存（Undo用）
      imageDataRef.current = ctx.getImageData(0, 0, drawWidth, drawHeight);
      // 初期状態を履歴に追加
      setDrawHistory([ctx.getImageData(0, 0, drawWidth, drawHeight)]);

      URL.revokeObjectURL(url);
      logger.debug("Annotator: image loaded", { drawWidth, drawHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      logger.error("Annotator: failed to load image");
    };

    img.src = url;
  }, [imageBlob]);

  /**
   * 描画座標を取得（Canvas上の座標に変換）
   */
  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  /**
   * 描画開始
   */
  const handlePointerDown = useCallback(
    (e) => {
      if (!isDrawMode) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      // PointerCapture で途切れ防止
      canvas.setPointerCapture(e.pointerId);

      const ctx = canvas.getContext("2d");
      const { x, y } = getCanvasCoords(e);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = PEN_COLOR;
      ctx.lineWidth = PEN_WIDTH;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      setIsDrawing(true);
    },
    [isDrawMode, getCanvasCoords]
  );

  /**
   * 描画中
   */
  const handlePointerMove = useCallback(
    (e) => {
      if (!isDrawing || !isDrawMode) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const { x, y } = getCanvasCoords(e);

      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, isDrawMode, getCanvasCoords]
  );

  /**
   * 描画終了（履歴に保存）
   */
  const handlePointerUp = useCallback(
    (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.releasePointerCapture(e.pointerId);

      const ctx = canvas.getContext("2d");
      ctx.closePath();
      setIsDrawing(false);

      // 現在の状態を履歴に追加
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setDrawHistory((prev) => [...prev, imageData]);
    },
    [isDrawing]
  );

  /**
   * Undo: 直前の描画ストロークを取り消す
   */
  const handleUndo = useCallback(() => {
    if (drawHistory.length <= 1) return; // 元画像のみの場合は何もしない

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const newHistory = drawHistory.slice(0, -1);
    const prevState = newHistory[newHistory.length - 1];
    ctx.putImageData(prevState, 0, 0);
    setDrawHistory(newHistory);
  }, [drawHistory]);

  /**
   * 保存: 現在の Canvas 内容を Blob として onSave に渡す
   */
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          logger.info("Annotator: saving annotated image", {
            size: `${(blob.size / 1024).toFixed(1)}KB`,
          });
          onSave(blob);
        } else {
          logger.error("Annotator: toBlob returned null");
        }
      },
      "image/jpeg",
      0.85
    );
  }, [onSave]);

  return (
    <div className={styles["annotator-overlay"]}>
      {/* ヘッダー */}
      <div className={styles["annotator-header"]}>
        <span className={styles["annotator-title"]}>写真に注釈を追加</span>
        <div className={styles["annotator-actions"]}>
          <button
            className={`${styles["annotator-btn"]} ${styles["annotator-btn-ghost"]}`}
            onClick={onCancel}
          >
            <X size={18} />
            <span>閉じる</span>
          </button>
          <button
            className={`${styles["annotator-btn"]} ${styles["annotator-btn-primary"]}`}
            onClick={handleSave}
          >
            <Save size={18} />
            <span>保存</span>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className={styles["annotator-canvas-container"]}>
        <canvas
          ref={canvasRef}
          className={styles["annotator-canvas"]}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      {/* ツールバー */}
      <div className={styles["annotator-toolbar"]}>
        <button
          className={`${styles["annotator-tool-btn"]} ${isDrawMode ? styles.active : ""}`}
          onClick={() => setIsDrawMode(!isDrawMode)}
        >
          <Pen size={18} />
          <div className={styles["pen-indicator"]} />
          赤ペン
        </button>
        <button
          className={styles["annotator-tool-btn"]}
          onClick={handleUndo}
          disabled={drawHistory.length <= 1}
        >
          <Undo2 size={18} />
          元に戻す
        </button>
      </div>
    </div>
  );
}
