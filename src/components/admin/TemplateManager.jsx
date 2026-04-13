import { useState } from "react";
import { 
  ChevronLeft, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  Check, 
  FileEdit
} from "lucide-react";
import { useTemplates } from "../../providers/TemplateContext";
import styles from "./TemplateManager.module.css";
import ConfirmModal from "../common/ConfirmModal";
import logger from "../../utils/logger";

/**
 * テンプレート一覧・管理画面
 */
export default function TemplateManager({ onBack, onEditTemplate }) {
  const { 
    templates, 
    activeTemplateId, 
    switchTemplate, 
    saveTemplate, 
    deleteTemplate 
  } = useTemplates();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // id
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 新規テンプレート作成
  const handleCreateNew = async () => {
    const rawName = window.prompt("チェックリストの名前を入力してください", "新しいチェックリスト");
    if (rawName === null) return; // キャンセル

    const name = rawName.trim() || "無題のチェックリスト";

    const newTemplate = {
      id: "tmpl_" + Date.now(),
      name,
      categories: [
        {
          id: "cat_1",
          name: "基本項目",
          items: []
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      await saveTemplate(newTemplate);
      logger.info("Created and saving new template", newTemplate.id);
      // 即座に編集画面へ遷移させる
      onEditTemplate(newTemplate);
    } catch (err) {
      logger.error("Failed to create template", err);
      alert("作成に失敗しました");
    }
  };

  // エクスポート (JSON)
  const handleExport = (template) => {
    const dataStr = JSON.stringify(template, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `${template.name}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    logger.info("Exported template", template.id);
  };

  // インポート (JSON)
  const processImportFile = (file) => {
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const template = JSON.parse(event.target.result);
        
        // 簡易バリデーション
        if (!template.name || !Array.isArray(template.categories)) {
          throw new Error("不正な形式のファイルです");
        }

        // 新しいIDを発行してインポート（同名衝突を避けるため、または上書きを避けるため）
        const importedTemplate = {
          ...template,
          id: "tmpl_imp_" + Date.now(),
          name: template.name + " (インポート)",
          updatedAt: new Date().toISOString()
        };

        await saveTemplate(importedTemplate);
        logger.info("Imported template", importedTemplate.id);
        alert("インポートが完了しました");
      } catch {
        logger.error("Import failed");
        alert("インポートに失敗しました");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = (e) => {
    processImportFile(e.target.files[0]);
    e.target.value = ""; // reset
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      processImportFile(file);
    } else if (file) {
      alert('JSONファイルのみ対応しています。');
    }
  };

  return (
    <div 
      className={`${styles.container} ${isDragging ? styles.dragging : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ヘッダー */}
      <header className={styles.header}>
        <button className={styles["back-btn"]} onClick={onBack}>
          <ChevronLeft />
        </button>
        <h1>チェックリスト管理</h1>
        <button className={styles["add-btn"]} onClick={handleCreateNew}>
          <Plus size={20} />
        </button>
      </header>

      <div className={styles.content}>
        <p className={styles.description}>
          使用するチェックリストを選択、または新規作成・編集できます。
        </p>

        <div className={styles.list}>
          {templates.map(template => (
            <div 
              key={template.id} 
              className={`${styles.card} ${activeTemplateId === template.id ? styles.active : ""}`}
            >
              <div className={styles["card-main"]} onClick={() => switchTemplate(template.id)}>
                <div className={styles["status-icon"]}>
                  {activeTemplateId === template.id ? <Check size={20} /> : <div className={styles.dot} />}
                </div>
                <div className={styles.info}>
                  <h3>{template.name}</h3>
                  <span>{template.categories.reduce((acc, cat) => acc + cat.items.length, 0)} 項目</span>
                </div>
              </div>

              <div className={styles.actions}>
                {template.id !== "default" && (
                  <button 
                    className={styles["icon-btn"]} 
                    title="編集" 
                    onClick={() => onEditTemplate(template)}
                  >
                    <FileEdit size={18} />
                  </button>
                )}
                <button 
                  className={styles["icon-btn"]} 
                  title="エクスポート" 
                  onClick={() => handleExport(template)}
                >
                  <Download size={18} />
                </button>
                {template.id !== "default" && (
                   <button 
                    className={styles["icon-btn-delete"]} 
                    title="削除" 
                    onClick={() => setShowDeleteConfirm(template)}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <label className={styles["import-label"]}>
            <Upload size={18} /> テンプレートをインポート
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImport} 
              disabled={isImporting}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="チェックリストの削除"
          message={`「${showDeleteConfirm.name}」を削除してもよろしいですか？この操作は戻せません。`}
          confirmLabel="削除する"
          confirmVariant="danger"
          onConfirm={async () => {
            await deleteTemplate(showDeleteConfirm.id);
            setShowDeleteConfirm(null);
          }}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
