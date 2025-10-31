import { describe, it, expect } from "vitest";
import { updatePrdDocumentSchema } from "@/lib/validation/prdDocument.schema";

describe("updatePrdDocumentSchema", () => {
  it("should validate valid content", () => {
    const result = updatePrdDocumentSchema.safeParse({ content: "Valid document content" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("Valid document content");
    }
  });

  it("should validate content with exactly 1 character", () => {
    const result = updatePrdDocumentSchema.safeParse({ content: "a" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("a");
    }
  });

  it("should validate content at exactly max length (50000 chars)", () => {
    const content = "a".repeat(50000);
    const result = updatePrdDocumentSchema.safeParse({ content });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe(content);
    }
  });

  it("should return an error when content exceeds max length", () => {
    const content = "a".repeat(50001);
    const result = updatePrdDocumentSchema.safeParse({ content });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Treść może mieć maksymalnie 50000 znaków");
    }
  });

  it("should return an error when content is empty string", () => {
    const result = updatePrdDocumentSchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Treść nie może być pusta");
    }
  });

  it("should return an error when content is whitespace-only", () => {
    const result = updatePrdDocumentSchema.safeParse({ content: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Treść nie może być pusta");
    }
  });

  it("should trim whitespace from content", () => {
    const result = updatePrdDocumentSchema.safeParse({ content: "  Valid content  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("Valid content");
    }
  });

  it("should return an error when content is null", () => {
    const result = updatePrdDocumentSchema.safeParse({ content: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Treść musi być tekstem");
    }
  });

  it("should return an error when content is undefined", () => {
    const result = updatePrdDocumentSchema.safeParse({ content: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Treść jest wymagana");
    }
  });

  it("should return an error for incorrect data type - number", () => {
    const result = updatePrdDocumentSchema.safeParse({ content: 12345 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Treść musi być tekstem");
    }
  });

  it("should return an error for incorrect data type - object", () => {
    const result = updatePrdDocumentSchema.safeParse({ content: {} });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Treść musi być tekstem");
    }
  });

  it("should return an error for incorrect data type - array", () => {
    const result = updatePrdDocumentSchema.safeParse({ content: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Treść musi być tekstem");
    }
  });

  it("should return an error for incorrect data type - boolean", () => {
    const result = updatePrdDocumentSchema.safeParse({ content: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Treść musi być tekstem");
    }
  });
});

