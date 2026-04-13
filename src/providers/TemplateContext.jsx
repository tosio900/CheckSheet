import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import * as templateDb from "../utils/templateDb";
import logger from "../utils/logger";

const TemplateContext = createContext(null);

export function TemplateProvider({ children }) {
  const [templates, setTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState("default");
  const [isLoaded, setIsLoaded] = useState(false);

  // 初期読み込み
  useEffect(() => {
    async function load() {
      try {
        const [allTemplates, currentActiveId] = await Promise.all([
          templateDb.getTemplates(),
          templateDb.getActiveTemplateId()
        ]);
        setTemplates(allTemplates);
        setActiveTemplateId(currentActiveId);
        setIsLoaded(true);
      } catch (err) {
        logger.error("Failed to load templates", err);
      }
    }
    load();
  }, []);

  // アクティブなテンプレートを切り替える
  const switchTemplate = useCallback(async (id) => {
    try {
      await templateDb.setActiveTemplateId(id);
      setActiveTemplateId(id);
      logger.info("Switched active template", id);
    } catch (err) {
      logger.error("Failed to switch template", err);
    }
  }, []);

  // テンプレートを保存・更新
  const saveTemplate = useCallback(async (template) => {
    try {
      const updated = await templateDb.saveTemplate(template);
      setTemplates(prev => {
        const index = prev.findIndex(t => t.id === template.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updated;
          return next;
        }
        return [...prev, updated];
      });
      return updated;
    } catch (err) {
      logger.error("Failed to save template", err);
      throw err;
    }
  }, []);

  // テンプレートを削除
  const deleteTemplate = useCallback(async (id) => {
    try {
      await templateDb.deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      
      const currentActive = await templateDb.getActiveTemplateId();
      setActiveTemplateId(currentActive);
    } catch (err) {
      logger.error("Failed to delete template", err);
    }
  }, []);

  // アクティブなテンプレートオブジェクト
  const activeTemplate = useMemo(() => {
    return templates.find(t => t.id === activeTemplateId) || templates[0];
  }, [templates, activeTemplateId]);

  // 項目情報のパース
  const templateInfo = useMemo(() => {
    if (!activeTemplate) return { items: [], totalCount: 0, itemIndexMap: new Map() };
    return templateDb.processTemplate(activeTemplate);
  }, [activeTemplate]);

  const value = {
    templates,
    activeTemplateId,
    activeTemplate,
    templateInfo, // { items, totalCount, itemIndexMap }
    isLoaded,
    switchTemplate,
    saveTemplate,
    deleteTemplate
  };

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTemplates() {
  const context = useContext(TemplateContext);
  if (!context) throw new Error("useTemplates must be used within TemplateProvider");
  return context;
}
