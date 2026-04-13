import { describe, it, expect } from "vitest";
import { getAllItems, getItemIndexMap, TOTAL_ITEMS } from "./checkItems";

describe("checkItems", () => {
  describe("getAllItems", () => {
    it("should return frozen array of items", () => {
      const items = getAllItems();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(TOTAL_ITEMS);
      expect(Object.isFrozen(items)).toBe(true);
    });

    it("should return the exact same reference on subsequent calls", () => {
      const firstCall = getAllItems();
      const secondCall = getAllItems();
      expect(firstCall).toBe(secondCall);
    });
  });

  describe("getItemIndexMap", () => {
    it("should map item IDs to correct indices", () => {
      const map = getItemIndexMap();
      const items = getAllItems();
      
      expect(map instanceof Map).toBe(true);
      expect(map.size).toBe(TOTAL_ITEMS);
      
      // 先頭のアイテムのインデックスが0であること
      expect(map.get(items[0].id)).toBe(0);
      // 末尾のアイテムのインデックスがTOTAL_ITEMS - 1であること
      expect(map.get(items[TOTAL_ITEMS - 1].id)).toBe(TOTAL_ITEMS - 1);
    });

    it("should return undefined for non-existent IDs", () => {
      const map = getItemIndexMap();
      expect(map.get("non_existent_id_9999")).toBeUndefined();
    });
  });
});
