import { describe, it, expect } from "vitest";
import {
  GetPrdQuestionsQuerySchema,
  PrdQuestionAnswerSchema,
  UpdatePrdQuestionsCommandSchema,
  PrdRoundParamSchema,
} from "@/lib/validation/prdQuestion.schema";

describe("GetPrdQuestionsQuerySchema", () => {
  it("should apply default values when no input is provided", () => {
    const result = GetPrdQuestionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        page: 1,
        limit: 20,
      });
    }
  });

  it("should accept and parse valid query parameters", () => {
    const query = { page: "2", limit: "50" };
    const result = GetPrdQuestionsQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        page: 2,
        limit: 50,
      });
    }
  });

  it("should coerce string numbers to integers", () => {
    const query = { page: "5", limit: "10" };
    const result = GetPrdQuestionsQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(5);
      expect(result.data.limit).toBe(10);
    }
  });

  it("should validate boundary values correctly", () => {
    const result1 = GetPrdQuestionsQuerySchema.safeParse({ page: 1, limit: 1 });
    expect(result1.success).toBe(true);
    if (result1.success) {
      expect(result1.data.page).toBe(1);
      expect(result1.data.limit).toBe(1);
    }

    const result2 = GetPrdQuestionsQuerySchema.safeParse({ page: 1, limit: 100 });
    expect(result2.success).toBe(true);
    if (result2.success) {
      expect(result2.data.limit).toBe(100);
    }
  });

  it.each([
    ["page", { page: 0 }],
    ["limit", { limit: 0 }],
    ["page", { page: -1 }],
    ["limit", { limit: -5 }],
  ])("should return an error for non-positive value for '%s'", (_, query) => {
    const result = GetPrdQuestionsQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
  });

  it("should return an error when limit exceeds maximum (100)", () => {
    const result = GetPrdQuestionsQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Limit nie może przekroczyć 100");
    }
  });

  it.each([
    ["page", { page: "2.5" }],
    ["limit", { limit: "3.7" }],
    ["page", { page: 2.5 }],
    ["limit", { limit: 3.7 }],
  ])("should return an error for float value for '%s'", (_, query) => {
    const result = GetPrdQuestionsQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
    // Zod returns "Expected integer, received float" for int() validation
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("integer");
    }
  });

  it.each([
    ["page", { page: "-1" }],
    ["limit", { limit: "-5" }],
    ["page", { page: "0" }],
  ])("should return an error for non-positive string value for '%s'", (_, query) => {
    const result = GetPrdQuestionsQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
  });

  it("should return an error for empty string values", () => {
    const result = GetPrdQuestionsQuerySchema.safeParse({ page: "", limit: "" });
    expect(result.success).toBe(false);
  });

  it("should return an error for invalid data types", () => {
    const result = GetPrdQuestionsQuerySchema.safeParse({ page: {}, limit: [] });
    expect(result.success).toBe(false);
  });
});

describe("PrdQuestionAnswerSchema", () => {
  const validData = {
    questionId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    text: "This is a valid answer",
  };

  it("should validate correct UUID and non-empty text", () => {
    const result = PrdQuestionAnswerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should return an error for invalid UUID format", () => {
    const result = PrdQuestionAnswerSchema.safeParse({
      questionId: "not-a-uuid",
      text: "Valid answer",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("ID pytania musi być prawidłowym UUID");
    }
  });

  it("should return an error when text is empty string", () => {
    const result = PrdQuestionAnswerSchema.safeParse({
      questionId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      text: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Odpowiedź nie może być pusta");
    }
  });

  it("should accept whitespace-only text (trims after min check)", () => {
    // Note: Schema has .min(1).trim() order, so whitespace passes min(1) check
    // then gets trimmed to empty string, but validation already passed
    const result = PrdQuestionAnswerSchema.safeParse({
      questionId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      text: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text).toBe("");
    }
  });

  it("should trim whitespace from text", () => {
    const result = PrdQuestionAnswerSchema.safeParse({
      questionId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      text: "  Valid answer  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text).toBe("Valid answer");
    }
  });

  it("should return an error when questionId is null", () => {
    const result = PrdQuestionAnswerSchema.safeParse({
      questionId: null,
      text: "Valid answer",
    });
    expect(result.success).toBe(false);
  });

  it("should return an error when text is null", () => {
    const result = PrdQuestionAnswerSchema.safeParse({
      questionId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      text: null,
    });
    expect(result.success).toBe(false);
  });

  it("should return an error when questionId is undefined", () => {
    const result = PrdQuestionAnswerSchema.safeParse({
      questionId: undefined,
      text: "Valid answer",
    });
    expect(result.success).toBe(false);
  });

  it("should return an error for incorrect data types", () => {
    const result = PrdQuestionAnswerSchema.safeParse({
      questionId: 12345,
      text: "Valid answer",
    });
    expect(result.success).toBe(false);
  });

  it("should return an error when text is a number", () => {
    const result = PrdQuestionAnswerSchema.safeParse({
      questionId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      text: 12345,
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdatePrdQuestionsCommandSchema", () => {
  const validAnswer = {
    questionId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    text: "Valid answer",
  };

  it("should validate answers array with exactly 1 answer", () => {
    const result = UpdatePrdQuestionsCommandSchema.safeParse({ answers: [validAnswer] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.answers).toHaveLength(1);
    }
  });

  it("should validate answers array with multiple answers", () => {
    const answers = [
      validAnswer,
      {
        questionId: "b2c3d4e5-f6a7-8901-2345-678901bcdef0",
        text: "Another valid answer",
      },
    ];
    const result = UpdatePrdQuestionsCommandSchema.safeParse({ answers });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.answers).toHaveLength(2);
      expect(result.data.answers[1].questionId).toBe("b2c3d4e5-f6a7-8901-2345-678901bcdef0");
      expect(result.data.answers[1].text).toBe("Another valid answer");
    }
  });

  it("should return an error for empty array", () => {
    const result = UpdatePrdQuestionsCommandSchema.safeParse({ answers: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Przynajmniej jedna odpowiedź musi być podana");
    }
  });

  it("should return an error when array contains invalid answer", () => {
    const result = UpdatePrdQuestionsCommandSchema.safeParse({
      answers: [
        validAnswer,
        {
          questionId: "invalid-uuid",
          text: "Valid text",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should return an error when array contains answer with empty text", () => {
    const result = UpdatePrdQuestionsCommandSchema.safeParse({
      answers: [
        {
          questionId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
          text: "",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should return an error when answers is null", () => {
    const result = UpdatePrdQuestionsCommandSchema.safeParse({ answers: null });
    expect(result.success).toBe(false);
  });

  it("should return an error when answers is undefined", () => {
    const result = UpdatePrdQuestionsCommandSchema.safeParse({ answers: undefined });
    expect(result.success).toBe(false);
  });

  it("should return an error when answers is not an array", () => {
    const result = UpdatePrdQuestionsCommandSchema.safeParse({ answers: "not-an-array" });
    expect(result.success).toBe(false);
  });

  it("should return an error when answers is an object", () => {
    const result = UpdatePrdQuestionsCommandSchema.safeParse({ answers: {} });
    expect(result.success).toBe(false);
  });
});

describe("PrdRoundParamSchema", () => {
  it("should validate literal 'latest'", () => {
    const result = PrdRoundParamSchema.safeParse("latest");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("latest");
    }
  });

  it("should validate positive integer as string", () => {
    const result = PrdRoundParamSchema.safeParse("1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(1);
    }
  });

  it("should validate positive integer as number", () => {
    const result = PrdRoundParamSchema.safeParse(1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(1);
    }
  });

  it("should validate boundary value - 1", () => {
    const result = PrdRoundParamSchema.safeParse(1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(1);
    }
  });

  it("should validate larger positive integers", () => {
    const result = PrdRoundParamSchema.safeParse(5);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(5);
    }
  });

  it("should return an error for 0", () => {
    const result = PrdRoundParamSchema.safeParse(0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Numer rundy musi być dodatnią liczbą całkowitą");
    }
  });

  it("should return an error for negative number", () => {
    const result = PrdRoundParamSchema.safeParse(-1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Numer rundy musi być dodatnią liczbą całkowitą");
    }
  });

  it("should return an error for float number", () => {
    const result = PrdRoundParamSchema.safeParse(1.5);
    expect(result.success).toBe(false);
  });

  it("should return an error for float string", () => {
    const result = PrdRoundParamSchema.safeParse("1.5");
    expect(result.success).toBe(false);
  });

  it("should return an error for non-numeric string", () => {
    const result = PrdRoundParamSchema.safeParse("not-a-number");
    expect(result.success).toBe(false);
  });

  it("should return an error for empty string", () => {
    const result = PrdRoundParamSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("should return an error for null", () => {
    const result = PrdRoundParamSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("should return an error for undefined", () => {
    const result = PrdRoundParamSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });

  it("should return an error for invalid literal", () => {
    const result = PrdRoundParamSchema.safeParse("invalid");
    expect(result.success).toBe(false);
  });
});
