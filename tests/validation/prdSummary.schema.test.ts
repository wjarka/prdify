import { describe, it, expect } from "vitest";
import { updatePrdSummarySchema } from "@/lib/validation/prdSummary.schema";

describe("updatePrdSummarySchema", () => {
  it("should validate valid summary", () => {
    const result = updatePrdSummarySchema.safeParse({ summary: "Valid summary content" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toBe("Valid summary content");
    }
  });

  it("should validate summary with exactly 1 character", () => {
    const result = updatePrdSummarySchema.safeParse({ summary: "a" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toBe("a");
    }
  });

  it("should validate summary at exactly max length (10000 chars)", () => {
    const summary = "a".repeat(10000);
    const result = updatePrdSummarySchema.safeParse({ summary });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toBe(summary);
    }
  });

  it("should return an error when summary exceeds max length", () => {
    const summary = "a".repeat(10001);
    const result = updatePrdSummarySchema.safeParse({ summary });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Podsumowanie może mieć maksymalnie 10000 znaków");
    }
  });

  it("should return an error when summary is empty string", () => {
    const result = updatePrdSummarySchema.safeParse({ summary: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Podsumowanie nie może być puste");
    }
  });

  it("should return an error when summary is whitespace-only", () => {
    const result = updatePrdSummarySchema.safeParse({ summary: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Podsumowanie nie może być puste");
    }
  });

  it("should trim whitespace from summary", () => {
    const result = updatePrdSummarySchema.safeParse({ summary: "  Valid summary  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toBe("Valid summary");
    }
  });

  it("should return an error when summary is null", () => {
    const result = updatePrdSummarySchema.safeParse({ summary: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Podsumowanie musi być tekstem");
    }
  });

  it("should return an error when summary is undefined", () => {
    const result = updatePrdSummarySchema.safeParse({ summary: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Podsumowanie jest wymagane");
    }
  });

  it("should return an error for incorrect data type - number", () => {
    const result = updatePrdSummarySchema.safeParse({ summary: 12345 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Podsumowanie musi być tekstem");
    }
  });

  it("should return an error for incorrect data type - object", () => {
    const result = updatePrdSummarySchema.safeParse({ summary: {} });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Podsumowanie musi być tekstem");
    }
  });

  it("should return an error for incorrect data type - array", () => {
    const result = updatePrdSummarySchema.safeParse({ summary: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Podsumowanie musi być tekstem");
    }
  });

  it("should return an error for incorrect data type - boolean", () => {
    const result = updatePrdSummarySchema.safeParse({ summary: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Podsumowanie musi być tekstem");
    }
  });
});
