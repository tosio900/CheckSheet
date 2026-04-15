import { get, set } from "idb-keyval";
import {
  categories as defaultCategories,
  CHECK_ITEMS_SCHEMA_VERSION
} from "../data/checkItems";

const TEMPLATES_KEY = "survey_templates_v1";
const ACTIVE_TEMPLATE_ID_KEY = "active_template_id_v1";

/**
 * テンプレート操作ユーティリティ
 */

function cloneCategories(categories) {
  if (typeof structuredClone === "function") {
    return structuredClone(categories);
  }
  return JSON.parse(JSON.stringify(categories));
}

/**
 * 初期テンプレートを生成する
 */
function createDefaultTemplate() {
  return {
    id: "default",
    name: "測量前標準チェックリスト",
    categories: cloneCategories(defaultCategories),
    schemaVersion: CHECK_ITEMS_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true
  };
}

/**
 * 全てのテンプレートを取得する
 */
export async function getTemplates() {
  const templates = await get(TEMPLATES_KEY);
  if (!templates || templates.length === 0) {
    const defaultTemplate = createDefaultTemplate();
    await set(TEMPLATES_KEY, [defaultTemplate]);
    return [defaultTemplate];
  }

  const defaultIndex = templates.findIndex(t => t.id === "default");
  if (defaultIndex < 0) return templates;

  const savedDefault = templates[defaultIndex];
  const savedVersion = savedDefault.schemaVersion ?? 0;
  if (savedVersion >= CHECK_ITEMS_SCHEMA_VERSION) return templates;

  const migratedDefault = {
    ...savedDefault,
    categories: cloneCategories(defaultCategories),
    schemaVersion: CHECK_ITEMS_SCHEMA_VERSION,
    updatedAt: new Date().toISOString()
  };

  const nextTemplates = [...templates];
  nextTemplates[defaultIndex] = migratedDefault;
  await set(TEMPLATES_KEY, nextTemplates);
  return nextTemplates;
}

/**
 * テンプレートを保存または更新する
 */
export async function saveTemplate(template) {
  const templates = await getTemplates();
  const index = templates.findIndex(t => t.id === template.id);
  
  const updatedTemplate = {
    ...template,
    updatedAt: new Date().toISOString()
  };

  if (index >= 0) {
    templates[index] = updatedTemplate;
  } else {
    templates.push(updatedTemplate);
  }
  
  await set(TEMPLATES_KEY, templates);
  return updatedTemplate;
}

/**
 * テンプレートを削除する
 */
export async function deleteTemplate(id) {
  const templates = await getTemplates();
  const filtered = templates.filter(t => t.id !== id);
  await set(TEMPLATES_KEY, filtered);
  
  // アクティブなものが削除された場合、デフォルトに戻す
  const activeId = await getActiveTemplateId();
  if (activeId === id) {
    await setActiveTemplateId("default");
  }
}

/**
 * アクティブなテンプレートIDを取得する
 */
export async function getActiveTemplateId() {
  const activeId = await get(ACTIVE_TEMPLATE_ID_KEY);
  return activeId || "default";
}

/**
 * アクティブなテンプレートIDを設定する
 */
export async function setActiveTemplateId(id) {
  await set(ACTIVE_TEMPLATE_ID_KEY, id);
}

/**
 * 特定のテンプレートを取得する
 */
export async function getTemplate(id) {
  const templates = await getTemplates();
  return templates.find(t => t.id === id) || templates[0];
}

/**
 * テンプレートからフラットな項目リストと合計数を算出するユーティリティ
 */
export function processTemplate(template) {
  const items = [];
  for (const category of template.categories) {
    for (const item of category.items) {
      items.push({
        ...item,
        categoryId: category.id,
        categoryName: category.name
      });
    }
  }
  return {
    items,
    totalCount: items.length,
    itemIndexMap: new Map(items.map((item, i) => [item.id, i]))
  };
}
