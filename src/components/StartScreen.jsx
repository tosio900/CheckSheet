import { useState } from "react";
import { loadUserProfile, saveUserProfile } from "../utils/storage";
import { CheckCircle, ArrowLeft } from "lucide-react";
import styles from "./StartScreen.module.css";

/**
 * チェック開始画面コンポーネント
 * 現場名・点検者名・日付を入力する
 */
export default function StartScreen({ onStart, onBack }) {
  const [profile] = useState(() => loadUserProfile() || {});

  const [siteName, setSiteName] = useState(profile.siteName || "");
  const [inspector, setInspector] = useState(profile.inspector || "");
  const [memo, setMemo] = useState("");
  const [errors, setErrors] = useState({});

  /** バリデーション */
  const validate = () => {
    const newErrors = {};
    if (!siteName.trim()) newErrors.siteName = "現場名を入力してください";
    if (!inspector.trim()) newErrors.inspector = "点検者名を入力してください";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** チェック開始 */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // 入力履歴を保存して次回に備える
    saveUserProfile(siteName.trim(), inspector.trim());

    onStart({
      siteName: siteName.trim(),
      inspector: inspector.trim(),
      memo: memo.trim(),
    });
  };

  return (
    <div className={styles["start-screen"]}>
      <div className={styles["start-header"]}>
        <h1>チェック情報入力</h1>
        <p>チェックを開始するための情報を入力してください</p>
      </div>

      <form className={styles["start-form"]} onSubmit={handleSubmit}>
        {/* 現場名 */}
        <div className="form-group">
          <label className="form-label" htmlFor="input-site-name">
            現場名 <span className="required">*</span>
          </label>
          <input
            id="input-site-name"
            className={`form-input ${errors.siteName ? "error" : ""}`}
            type="text"
            placeholder="例：〇〇道路改良工事"
            value={siteName}
            onChange={(e) => {
              setSiteName(e.target.value);
              if (errors.siteName) setErrors((prev) => ({ ...prev, siteName: "" }));
            }}
            autoComplete="off"
          />
          {errors.siteName && <p className="form-error">{errors.siteName}</p>}
        </div>

        {/* 点検者名 */}
        <div className="form-group">
          <label className="form-label" htmlFor="input-inspector">
            点検者名 <span className="required">*</span>
          </label>
          <input
            id="input-inspector"
            className={`form-input ${errors.inspector ? "error" : ""}`}
            type="text"
            placeholder="例：山田太郎"
            value={inspector}
            onChange={(e) => {
              setInspector(e.target.value);
              if (errors.inspector) setErrors((prev) => ({ ...prev, inspector: "" }));
            }}
            autoComplete="off"
          />
          {errors.inspector && <p className="form-error">{errors.inspector}</p>}
        </div>



        {/* 備考・メモ（任意） */}
        <div className="form-group">
          <label className="form-label" htmlFor="input-memo">
            メモ・特記事項 <span className="form-label-optional">(任意)</span>
          </label>
          <textarea
            id="input-memo"
            className="form-input"
            placeholder="例：〇〇側の境界線について特記事項あり"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            style={{ resize: "vertical" }}
          />
        </div>

        {/* アクションボタン */}
        <div className={styles["start-actions"]}>
          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            id="btn-start-check"
          >
            <CheckCircle size={20} /> チェック開始
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={onBack}
            id="btn-back-to-home"
          >
            <ArrowLeft size={16} /> ホームに戻る
          </button>
        </div>
      </form>
    </div>
  );
}
