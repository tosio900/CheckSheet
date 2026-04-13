import { describe, it, expect } from "vitest";
import {
  createAnswerObject,
  updateAnswersList,
  calculateNextIndex,
  isSessionCompleted,
  calculateSummary
} from "./sessionLogic";

describe("sessionLogic", () => {
  describe("createAnswerObject", () => {
    it("should create a valid answer object", () => {
      const item = { categoryId: "cat1", id: "item1", question: "Is this a test?", inputs: ["input1"] };
      const obj = createAnswerObject(item, "yes", { input1: "value1" });
      
      expect(obj.categoryId).toBe("cat1");
      expect(obj.itemId).toBe("item1");
      expect(obj.answer).toBe("yes");
      expect(obj.inputs).toEqual({ input1: "value1" });
      expect(obj.answeredAt).toBeDefined();
    });

    it("should set inputs to null if item has no inputs", () => {
      const item = { categoryId: "cat1", id: "item1", question: "Is this a test?" };
      const obj = createAnswerObject(item, "no", { input1: "ignored" });
      
      expect(obj.inputs).toBeNull();
    });
  });

  describe("updateAnswersList", () => {
    it("should add a new answer if it does not exist", () => {
      const current = [{ itemId: "item1", answer: "yes" }];
      const newAnswer = { itemId: "item2", answer: "no" };
      
      const updated = updateAnswersList(current, newAnswer);
      expect(updated.length).toBe(2);
      expect(updated[1].itemId).toBe("item2");
    });

    it("should update an existing answer", () => {
      const current = [{ itemId: "item1", answer: "yes" }];
      const newAnswer = { itemId: "item1", answer: "no" };
      
      const updated = updateAnswersList(current, newAnswer);
      expect(updated.length).toBe(1);
      expect(updated[0].answer).toBe("no");
    });
  });

  describe("calculateNextIndex", () => {
    it("should increment index if not at the end", () => {
      expect(calculateNextIndex(0, 10)).toBe(1);
      expect(calculateNextIndex(8, 10)).toBe(9);
    });

    it("should stay at the same index if at the end", () => {
      expect(calculateNextIndex(9, 10)).toBe(9);
    });
  });

  describe("isSessionCompleted", () => {
    it("should return false if unique answers are less than total items", () => {
      const answers = [{ itemId: "item1" }, { itemId: "item2" }];
      expect(isSessionCompleted(answers, 3)).toBe(false);
    });

    it("should return true if unique answers equal total items", () => {
      const answers = [{ itemId: "item1" }, { itemId: "item2" }];
      expect(isSessionCompleted(answers, 2)).toBe(true);
    });

    it("should handle duplicate answers correctly", () => {
      const answers = [{ itemId: "item1" }, { itemId: "item1" }];
      expect(isSessionCompleted(answers, 2)).toBe(false);
    });
  });

  describe("calculateSummary", () => {
    it("should count yes and no correctly", () => {
      const answers = [
        { answer: "yes" },
        { answer: "no" },
        { answer: "yes" },
        { answer: "unknown" }
      ];
      const summary = calculateSummary(answers);
      expect(summary.yesCount).toBe(2);
      expect(summary.noCount).toBe(1);
    });
  });
});
