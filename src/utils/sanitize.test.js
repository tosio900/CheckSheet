import { describe, it, expect } from "vitest";
import { sanitizeFileName } from "./sanitize";

describe("sanitizeFileName", () => {
  it("should replace invalid characters with underscore", () => {
    const invalidChars = ["\\", "/", ":", "*", "?", '"', "<", ">", "|"];
    invalidChars.forEach(char => {
      expect(sanitizeFileName(`test${char}file`)).toBe("test_file");
    });
  });

  it("should handle multiple invalid characters", () => {
    expect(sanitizeFileName("file:name/with*invalid?chars")).toBe("file_name_with_invalid_chars");
  });

  it("should trim whitespace", () => {
    expect(sanitizeFileName("  my file  ")).toBe("my file");
  });

  it("should return 'unknown' if input is empty after trimming", () => {
    expect(sanitizeFileName("   ")).toBe("unknown");
    expect(sanitizeFileName("")).toBe("unknown");
  });

  it("should return 'unknown' if input is null or undefined", () => {
    expect(sanitizeFileName(null)).toBe("unknown");
    expect(sanitizeFileName(undefined)).toBe("unknown");
  });

  it("should return 'unknown' if input is not a string", () => {
    expect(sanitizeFileName({})).toBe("unknown");
    expect(sanitizeFileName(123)).toBe("unknown");
  });
});
