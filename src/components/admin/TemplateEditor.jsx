import { useState } from "react";
import { 
  ChevronLeft, 
  Save, 
  Plus, 
  Trash2, 
  Settings2
} from "lucide-react";
import styles from "./TemplateEditor.module.css";

/**
 * テンプレート編集画面 (GUI)
 */
export default function TemplateEditor({ template, onBack, onSave }) {
  const [editedTemplate, setEditedTemplate] = useState({ ...template });

  // テンプレート名の更新
  const handleUpdateName = (val) => {
    setEditedTemplate(prev => ({ ...prev, name: val }));
  };

  // カテゴリの追加
  const addCategory = () => {
    setEditedTemplate(prev => ({
      ...prev,
      categories: [
        ...prev.categories,
        { id: "cat_" + Date.now(), name: "新しいカテゴリ", items: [] }
      ]
    }));
  };

  // カテゴリの削除
  const removeCategory = (catId) => {
    setEditedTemplate(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== catId)
    }));
  };

  // 質問項目の追加
  const addItem = (catId) => {
    setEditedTemplate(prev => ({
      ...prev,
      categories: prev.categories.map(cat => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: [
            ...cat.items,
            { id: "item_" + Date.now(), question: "新しい質問項目", note: "", inputs: null }
          ]
        };
      })
    }));
  };

  // 質問項目の削除
  const removeItem = (catId, itemId) => {
    setEditedTemplate(prev => ({
      ...prev,
      categories: prev.categories.map(cat => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: cat.items.filter(i => i.id !== itemId)
        };
      })
    }));
  };

  // 項目の内容更新
  const updateItem = (catId, itemId, field, value) => {
    setEditedTemplate(prev => ({
      ...prev,
      categories: prev.categories.map(cat => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: cat.items.map(i => {
            if (i.id !== itemId) return i;
            return { ...i, [field]: value };
          })
        };
      })
    }));
  };

  // 入力フィールド（点名など）のトグル
  const toggleInputs = (catId, itemId) => {
    setEditedTemplate(prev => ({
      ...prev,
      categories: prev.categories.map(cat => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: cat.items.map(i => {
            if (i.id !== itemId) return i;
            // null or array
            return { ...i, inputs: i.inputs ? null : ["点名1", "点名2"] };
          })
        };
      })
    }));
  };

  const handleSave = () => {
    onSave(editedTemplate);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles["back-btn"]} onClick={onBack}>
          <ChevronLeft />
        </button>
        <div className={styles.title}>
            <input 
                type="text" 
                value={editedTemplate.name} 
                onChange={(e) => handleUpdateName(e.target.value)}
                className={styles["name-input"]}
            />
        </div>
        <button className={styles["save-btn"]} onClick={handleSave}>
          <Save size={20} />
          <span>保存</span>
        </button>
      </header>

      <div className={styles.content}>
        {editedTemplate.categories.map((cat, catIdx) => (
          <div key={cat.id} className={styles.category}>
            <div className={styles["category-header"]}>
              <div className={styles["category-title"]}>
                <span className={styles["cat-index"]}>{catIdx + 1}</span>
                <input 
                  type="text" 
                  value={cat.name} 
                  onChange={(e) => {
                    const next = [...editedTemplate.categories];
                    next[catIdx] = { ...cat, name: e.target.value };
                    setEditedTemplate({ ...editedTemplate, categories: next });
                  }}
                  className={styles["cat-name-input"]}
                />
              </div>
              <button 
                className={styles["cat-del-btn"]} 
                onClick={() => removeCategory(cat.id)}
                disabled={editedTemplate.categories.length === 1}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className={styles.items}>
              {cat.items.map((item) => (
                <div key={item.id} className={styles["item-card"]}>
                  <div className={styles["item-main"]}>
                    <textarea 
                      value={item.question}
                      onChange={(e) => updateItem(cat.id, item.id, "question", e.target.value)}
                      placeholder="質問内容"
                      rows={2}
                    />
                    <textarea 
                      value={item.note || ""}
                      onChange={(e) => updateItem(cat.id, item.id, "note", e.target.value)}
                      placeholder="補足説明・注意事項"
                      rows={3}
                      className={styles["note-area"]}
                    />
                  </div>
                  <div className={styles["item-meta"]}>
                    <button 
                        className={`${styles["toggle-btn"]} ${item.inputs ? styles.active : ""}`}
                        onClick={() => toggleInputs(cat.id, item.id)}
                    >
                        <Settings2 size={14} /> {item.inputs ? "入力枠あり(点名1/2)" : "入力枠なし"}
                    </button>
                    <button 
                      className={styles["item-del-btn"]}
                      onClick={() => removeItem(cat.id, item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button className={styles["add-item-btn"]} onClick={() => addItem(cat.id)}>
                <Plus size={16} /> 項目を追加
              </button>
            </div>
          </div>
        ))}

        <button className={styles["add-cat-btn"]} onClick={addCategory}>
          <Plus size={20} /> カテゴリを追加
        </button>
      </div>
    </div>
  );
}
