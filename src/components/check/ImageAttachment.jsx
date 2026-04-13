import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, ImageIcon } from "lucide-react";
import ImageAnnotator from "./ImageAnnotator";
import { resizeImage } from "../../utils/imageResize";
import { generateImageId, saveImage, getImage, createImageURL } from "../../utils/imageDb";
import { useCheckSession } from "../../hooks/useCheckSession";
import logger from "../../utils/logger";
import styles from "./ImageAttachment.module.css";

/**
 * 画像添付コンポーネント
 *
 * 各チェック項目に写真を添付するためのUI。
 * - カメラ撮影 or ファイル選択
 * - リサイズ → IndexedDB 保存
 * - サムネイル表示
 * - タップで注釈エディタを開く
 * - 削除
 *
 * @param {string} itemId - チェック項目ID
 * @param {string[]} imageIds - 紐づいている画像IDリスト
 */
export default function ImageAttachment({ itemId, imageIds = [] }) {
  const { session, addImage, removeImage } = useCheckSession();
  const fileInputRef = useRef(null);
  const [thumbnails, setThumbnails] = useState({}); // { [imageId]: objectURL }
  const [isProcessing, setIsProcessing] = useState(false);
  const [annotatorState, setAnnotatorState] = useState(null); // { imageId, blob } or null

  /**
   * 画像IDリストからサムネイルURLを生成
   */
  useEffect(() => {
    let cancelled = false;

    const loadThumbnails = async () => {
      const newThumbs = {};
      for (const id of imageIds) {
        if (thumbnails[id]) {
          // 既にロード済みなら再利用
          newThumbs[id] = thumbnails[id];
          continue;
        }
        const blob = await getImage(id);
        if (blob && !cancelled) {
          newThumbs[id] = createImageURL(blob);
        }
      }

      if (!cancelled) {
        // 古いURLを解放
        for (const [id, url] of Object.entries(thumbnails)) {
          if (!imageIds.includes(id) && url) {
            URL.revokeObjectURL(url);
          }
        }
        setThumbnails(newThumbs);
      }
    };

    loadThumbnails();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageIds]);

  /**
   * コンポーネントのアンマウント時にURLを解放
   */
  useEffect(() => {
    return () => {
      Object.values(thumbnails).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * ファイル選択時の処理
   */
  const handleFileSelect = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file || !session) return;

      // input をリセット（同じファイルを再選択できるように）
      e.target.value = "";

      setIsProcessing(true);
      try {
        // リサイズ
        const resizedBlob = await resizeImage(file);

        // 注釈エディタを開く（注釈が不要なら即保存も可能）
        setAnnotatorState({ imageId: null, blob: resizedBlob });
      } catch (err) {
        logger.error("Image processing failed", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [session]
  );

  /**
   * 注釈エディタから保存されたとき
   */
  const handleAnnotatorSave = useCallback(
    async (annotatedBlob) => {
      if (!session) return;
      setIsProcessing(true);

      try {
        const imageId = annotatorState?.imageId || generateImageId(session.checkId, itemId);

        // IndexedDB に保存
        const success = await saveImage(imageId, annotatedBlob);
        if (success) {
          // 既存の画像を更新する場合
          if (annotatorState?.imageId) {
            // URL キャッシュを更新
            const newUrl = createImageURL(annotatedBlob);
            setThumbnails((prev) => {
              if (prev[imageId]) URL.revokeObjectURL(prev[imageId]);
              return { ...prev, [imageId]: newUrl };
            });
          } else {
            // 新規画像：セッションに画像IDを追加
            addImage(itemId, imageId);
            const newUrl = createImageURL(annotatedBlob);
            setThumbnails((prev) => ({ ...prev, [imageId]: newUrl }));
          }
          logger.info("Image saved", { imageId, itemId });
        }
      } catch (err) {
        logger.error("Image save failed", err);
      } finally {
        setAnnotatorState(null);
        setIsProcessing(false);
      }
    },
    [session, annotatorState, itemId, addImage]
  );

  /**
   * サムネイルタップ時: 注釈エディタを開く
   */
  const handleThumbnailClick = useCallback(
    async (imageId) => {
      const blob = await getImage(imageId);
      if (blob) {
        setAnnotatorState({ imageId, blob });
      }
    },
    []
  );

  /**
   * 画像削除
   */
  const handleDelete = useCallback(
    async (e, imageId) => {
      e.stopPropagation(); // サムネイルクリックの伝播を停止
      // URL 解放
      if (thumbnails[imageId]) {
        URL.revokeObjectURL(thumbnails[imageId]);
      }
      setThumbnails((prev) => {
        const next = { ...prev };
        delete next[imageId];
        return next;
      });
      // セッションから削除 & IndexedDB から削除
      await removeImage(itemId, imageId);
    },
    [itemId, removeImage, thumbnails]
  );

  return (
    <>
      <div className={styles["attachment-container"]}>
        <div className={styles["attachment-label"]}>
          <ImageIcon size={14} />
          写真 ({imageIds.length})
        </div>
        <div className={styles["attachment-grid"]}>
          {/* 添付済みサムネイル */}
          {imageIds.map((id) => (
            <div
              key={id}
              className={styles["thumbnail-wrapper"]}
              onClick={() => handleThumbnailClick(id)}
            >
              {thumbnails[id] ? (
                <img
                  src={thumbnails[id]}
                  alt="添付写真"
                  className={styles["thumbnail-img"]}
                />
              ) : (
                <div className={styles["thumbnail-loading"]}>
                  <div className={styles["thumbnail-spinner"]} />
                </div>
              )}
              <button
                className={styles["thumbnail-delete"]}
                onClick={(e) => handleDelete(e, id)}
                aria-label="写真を削除"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {/* ローディング中 */}
          {isProcessing && (
            <div className={styles["thumbnail-loading"]}>
              <div className={styles["thumbnail-spinner"]} />
            </div>
          )}

          {/* 追加ボタン */}
          <button
            className={styles["add-image-btn"]}
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            <Camera size={22} />
            追加
          </button>

          {/* 隠し input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className={styles["hidden-file-input"]}
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* 注釈エディタ（モーダル） */}
      {annotatorState && (
        <ImageAnnotator
          imageBlob={annotatorState.blob}
          onSave={handleAnnotatorSave}
          onCancel={() => setAnnotatorState(null)}
        />
      )}
    </>
  );
}
