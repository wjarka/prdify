import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import type { PrdQuestion, UpdatePrdQuestionsCommand } from "@/types";
import * as prdsModule from "@/lib/services/prds";
import {
  getPrdQuestions,
  submitAnswers,
  generateNextQuestions,
  getLatestPrdQuestionRound,
  PrdQuestionFetchingError,
  PrdQuestionUpdateError,
  PrdQuestionNotFoundError,
  PrdQuestionConflictError,
  PrdNotFoundError,
  PrdQuestionGenerationError,
  PrdQuestionAiGenerationError,
} from "@/lib/services/prdQuestion.service";
import { NetworkError, ApiError, ParsingError, ValidationError } from "@/lib/services/openrouter.types";

// Mock OpenRouterService at file level
const mockGetStructuredResponse = vi.fn();
vi.mock("@/lib/services/openrouter.service", () => {
  return {
    OpenRouterService: {
      getInstance: vi.fn(() => ({
        getStructuredResponse: mockGetStructuredResponse,
      })),
    },
  };
});

// Test data helpers
const mockPrdId = "00000000-0000-0000-0000-000000000001";
const mockQuestionId1 = "00000000-0000-0000-0000-000000000010";
const mockQuestionId2 = "00000000-0000-0000-0000-000000000011";

const createMockQuestionRow = (overrides?: Partial<PrdQuestion>): PrdQuestion => ({
  id: mockQuestionId1,
  prd_id: mockPrdId,
  round_number: 1,
  question: "Test question?",
  answer: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

// Helper to create a chainable Supabase query builder mock
const createMockQueryBuilder = () => {
  const builder = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(), // Added for submitAnswers
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return builder;
};

describe("prdQuestion.service.ts", () => {
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  let getCurrentRoundNumberSpy: ReturnType<typeof vi.spyOn> & {
    mockResolvedValue: (value: number) => void;
  };

  beforeEach(() => {
    mockQueryBuilder = createMockQueryBuilder();
    // Reset call history for query builder methods
    Object.values(mockQueryBuilder).forEach((fn) => {
      if (typeof fn === "function" && "mockClear" in fn) {
        (fn as { mockClear: () => void }).mockClear();
      }
    });
    // Setup spy for getCurrentRoundNumber
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getCurrentRoundNumberSpy = vi.spyOn(prdsModule, "getCurrentRoundNumber" as any) as ReturnType<typeof vi.spyOn> & {
      mockResolvedValue: (value: number) => void;
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Error Classes", () => {
    it("PrdQuestionFetchingError should have correct name and message", () => {
      const error = new PrdQuestionFetchingError();
      expect(error.name).toBe("PrdQuestionFetchingError");
      expect(error.message).toBe("Unable to fetch PRD questions");
    });

    it("PrdQuestionFetchingError should accept custom message", () => {
      const error = new PrdQuestionFetchingError("Custom message");
      expect(error.message).toBe("Custom message");
    });

    it("PrdQuestionUpdateError should have correct name and message", () => {
      const error = new PrdQuestionUpdateError();
      expect(error.name).toBe("PrdQuestionUpdateError");
      expect(error.message).toBe("Unable to update PRD questions");
    });

    it("PrdQuestionUpdateError should accept custom message", () => {
      const error = new PrdQuestionUpdateError("Custom message");
      expect(error.message).toBe("Custom message");
    });

    it("PrdQuestionNotFoundError should have correct name and message", () => {
      const error = new PrdQuestionNotFoundError();
      expect(error.name).toBe("PrdQuestionNotFoundError");
      expect(error.message).toBe("PRD question not found");
    });

    it("PrdQuestionNotFoundError should accept custom message", () => {
      const error = new PrdQuestionNotFoundError("Custom message");
      expect(error.message).toBe("Custom message");
    });

    it("PrdQuestionConflictError should have correct name and message", () => {
      const error = new PrdQuestionConflictError();
      expect(error.name).toBe("PrdQuestionConflictError");
      expect(error.message).toBe("Cannot update questions for a non-planning PRD");
    });

    it("PrdQuestionConflictError should accept custom message", () => {
      const error = new PrdQuestionConflictError("Custom message");
      expect(error.message).toBe("Custom message");
    });

    it("PrdNotFoundError should have correct name and message", () => {
      const error = new PrdNotFoundError();
      expect(error.name).toBe("PrdNotFoundError");
      expect(error.message).toBe("PRD not found");
    });

    it("PrdNotFoundError should accept custom message", () => {
      const error = new PrdNotFoundError("Custom message");
      expect(error.message).toBe("Custom message");
    });

    it("PrdQuestionGenerationError should have correct name and message", () => {
      const error = new PrdQuestionGenerationError();
      expect(error.name).toBe("PrdQuestionGenerationError");
      expect(error.message).toBe("Cannot generate questions for a non-planning PRD");
    });

    it("PrdQuestionGenerationError should accept custom message", () => {
      const error = new PrdQuestionGenerationError("Custom message");
      expect(error.message).toBe("Custom message");
    });

    it("PrdQuestionAiGenerationError should have correct name and message", () => {
      const error = new PrdQuestionAiGenerationError();
      expect(error.name).toBe("PrdQuestionAiGenerationError");
      expect(error.message).toBe("Failed to generate questions using AI service");
    });

    it("PrdQuestionAiGenerationError should accept custom message", () => {
      const error = new PrdQuestionAiGenerationError("Custom message");
      expect(error.message).toBe("Custom message");
    });
  });

  // Note: Private helper functions (mapPrdQuestionRowToDto, getQuestionsJsonSchema, buildSystemPrompt, buildUserPrompt)
  // are tested indirectly through public function tests. They can be tested directly if needed by exporting them
  // or using a test utility that imports the module and accesses them.

  describe("getPrdQuestions", () => {
    const mockQuestions = [
      createMockQuestionRow({ id: mockQuestionId1, round_number: 1 }),
      createMockQuestionRow({ id: mockQuestionId2, round_number: 1 }),
    ];

    it("should return paginated questions successfully", async () => {
      // Create separate query builders for PRD check, count, and data queries
      const prdCheckBuilder = createMockQueryBuilder();
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      // Count query: from().select("*", { count: "exact", head: true }).eq(prd_id)
      countBuilder.select.mockReturnThis(); // select() returns this
      countBuilder.eq.mockResolvedValue({
        count: 2,
        error: null,
      });

      // Data query: from().select("*").eq(prd_id).order().range()
      dataBuilder.select.mockReturnThis(); // select() returns this
      dataBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      dataBuilder.order.mockReturnThis(); // order() returns this
      dataBuilder.range.mockResolvedValue({
        data: mockQuestions,
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getPrdQuestions(mockSupabaseWithFrom, mockPrdId, 1, 10);

      expect(result).toHaveProperty("questions");
      expect(result).toHaveProperty("pagination");
      expect(result.questions).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalItems).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("should filter by roundNumber when provided", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      // Count query: from().select("*", { count: "exact", head: true }).eq(prd_id).eq(round_number)
      countBuilder.select.mockReturnThis(); // select() returns this
      countBuilder.eq
        .mockReturnValueOnce(countBuilder) // First eq(prd_id) returns this
        .mockResolvedValueOnce({ count: 1, error: null }); // Second eq(round_number) returns promise

      // Data query: from().select("*").eq(prd_id).eq(round_number).order().range()
      dataBuilder.select.mockReturnThis(); // select() returns this
      dataBuilder.eq
        .mockReturnValueOnce(dataBuilder) // First eq(prd_id) returns this
        .mockReturnValueOnce(dataBuilder); // Second eq(round_number) returns this
      dataBuilder.order.mockReturnThis(); // order() returns this
      const round1Questions = [createMockQuestionRow({ round_number: 1 })];
      dataBuilder.range.mockResolvedValue({
        data: round1Questions,
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getPrdQuestions(mockSupabaseWithFrom, mockPrdId, 1, 10, { roundNumber: 1 });

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].roundNumber).toBe(1);
      // Verify round filter was applied
      expect(countBuilder.eq).toHaveBeenCalledWith("round_number", 1);
      expect(dataBuilder.eq).toHaveBeenCalledWith("round_number", 1);
    });

    it("should return all rounds when roundNumber not provided", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      // Count query: from().select("*", { count: "exact", head: true }).eq(prd_id)
      countBuilder.select.mockReturnThis(); // select() returns this
      countBuilder.eq.mockResolvedValue({
        count: 2,
        error: null,
      });

      // Data query: from().select("*").eq(prd_id).order().range()
      dataBuilder.select.mockReturnThis(); // select() returns this
      dataBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      dataBuilder.order.mockReturnThis(); // order() returns this
      dataBuilder.range.mockResolvedValue({
        data: mockQuestions,
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getPrdQuestions(mockSupabaseWithFrom, mockPrdId, 1, 10);

      expect(result.questions).toHaveLength(2);
      // Verify round filter was NOT applied
      expect(countBuilder.eq).not.toHaveBeenCalledWith("round_number", expect.anything());
      expect(dataBuilder.eq).not.toHaveBeenCalledWith("round_number", expect.anything());
    });

    it("should order by created_at descending", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      // Count query: from().select("*", { count: "exact", head: true }).eq(prd_id)
      countBuilder.select.mockReturnThis(); // select() returns this
      countBuilder.eq.mockResolvedValue({
        count: 2,
        error: null,
      });

      // Data query: from().select("*").eq(prd_id).order().range()
      dataBuilder.select.mockReturnThis(); // select() returns this
      dataBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      dataBuilder.order.mockReturnThis(); // order() returns this
      dataBuilder.range.mockResolvedValue({
        data: mockQuestions,
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await getPrdQuestions(mockSupabaseWithFrom, mockPrdId, 1, 10);

      expect(dataBuilder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("should calculate pagination correctly", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      // Count query: from().select("*", { count: "exact", head: true }).eq(prd_id)
      countBuilder.select.mockReturnThis(); // select() returns this
      countBuilder.eq.mockResolvedValue({
        count: 25,
        error: null,
      });

      // Data query: from().select("*").eq(prd_id).order().range()
      dataBuilder.select.mockReturnThis(); // select() returns this
      dataBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      dataBuilder.order.mockReturnThis(); // order() returns this
      dataBuilder.range.mockResolvedValue({
        data: mockQuestions,
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getPrdQuestions(mockSupabaseWithFrom, mockPrdId, 2, 10);

      expect(result.pagination.totalItems).toBe(25);
      expect(result.pagination.totalPages).toBe(3); // Math.ceil(25/10)
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      // Verify range was called with correct offset (page 2, limit 10 = offset 10)
      expect(dataBuilder.range).toHaveBeenCalledWith(10, 19);
    });

    it("should throw PrdNotFoundError when PRD doesn't exist", async () => {
      const prdCheckBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await expect(getPrdQuestions(mockSupabaseWithFrom, mockPrdId, 1, 10)).rejects.toThrow(PrdNotFoundError);
    });

    it("should throw PrdQuestionFetchingError on other database errors", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      // Count query: from().select("*", { count: "exact", head: true }).eq(prd_id)
      // select() returns builder, eq() returns promise with error
      countBuilder.select.mockReturnThis(); // select() returns this for chaining
      countBuilder.eq.mockResolvedValue({
        count: null,
        error: { code: "500", message: "Database error" },
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await expect(getPrdQuestions(mockSupabaseWithFrom, mockPrdId, 1, 10)).rejects.toThrow(PrdQuestionFetchingError);

      // Set up fresh mocks for second assertion
      const prdCheckBuilder2 = createMockQueryBuilder();
      const countBuilder2 = createMockQueryBuilder();
      const dataBuilder2 = createMockQueryBuilder();

      prdCheckBuilder2.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      countBuilder2.select.mockReturnThis();
      countBuilder2.eq.mockResolvedValue({
        count: null,
        error: { code: "500", message: "Database error" },
      });

      const mockFrom2 = vi.fn();
      mockFrom2
        .mockReturnValueOnce(prdCheckBuilder2)
        .mockReturnValueOnce(countBuilder2)
        .mockReturnValueOnce(dataBuilder2);

      const mockSupabaseWithFrom2 = {
        from: mockFrom2,
      } as unknown as SupabaseClient;

      await expect(getPrdQuestions(mockSupabaseWithFrom2, mockPrdId, 1, 10)).rejects.toThrow("Database error");
    });

    it("should handle empty result sets", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      // Count query: from().select("*", { count: "exact", head: true }).eq(prd_id)
      countBuilder.select.mockReturnThis(); // select() returns this
      countBuilder.eq.mockResolvedValue({
        count: 0,
        error: null,
      });

      // Data query: from().select("*").eq(prd_id).order().range()
      dataBuilder.select.mockReturnThis(); // select() returns this
      dataBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      dataBuilder.order.mockReturnThis(); // order() returns this
      dataBuilder.range.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getPrdQuestions(mockSupabaseWithFrom, mockPrdId, 1, 10);

      expect(result.questions).toEqual([]);
      expect(result.pagination.totalItems).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it("should handle null count gracefully", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      // Count query: from().select("*", { count: "exact", head: true }).eq(prd_id)
      countBuilder.select.mockReturnThis(); // select() returns this
      countBuilder.eq.mockResolvedValue({
        count: null,
        error: null,
      });

      // Data query: from().select("*").eq(prd_id).order().range()
      dataBuilder.select.mockReturnThis(); // select() returns this
      dataBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      dataBuilder.order.mockReturnThis(); // order() returns this
      dataBuilder.range.mockResolvedValue({
        data: mockQuestions,
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getPrdQuestions(mockSupabaseWithFrom, mockPrdId, 1, 10);

      expect(result.pagination.totalItems).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe("submitAnswers", () => {
    const createMockCommand = (answers: { questionId: string; text: string }[]): UpdatePrdQuestionsCommand => ({
      answers,
    });

    it("should update answers successfully for valid questions", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const questionValidationBuilder = createMockQueryBuilder();
      const updateBuilder1 = createMockQueryBuilder();
      const updateBuilder2 = createMockQueryBuilder();

      // PRD check
      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId, status: "planning" },
        error: null,
      });

      // Question validation
      // Pattern: from().select("id").eq(prd_id).in(ids) - eq() returns this, in() returns promise
      questionValidationBuilder.select.mockReturnThis(); // select() returns this for chaining
      questionValidationBuilder.eq.mockReturnThis(); // eq(prd_id) returns this for chaining
      questionValidationBuilder.in.mockResolvedValue({
        data: [{ id: mockQuestionId1 }, { id: mockQuestionId2 }],
        error: null,
      });

      // Update queries (sequential)
      // The pattern is: from().update().eq(id).eq(prd_id) where second eq() returns promise
      // First update: eq(id) returns this, then eq(prd_id) returns promise
      updateBuilder1.eq
        .mockReturnValueOnce(updateBuilder1) // First eq(id) returns this for chaining
        .mockResolvedValueOnce({ error: null }); // Second eq(prd_id) returns promise

      // Second update: same pattern
      updateBuilder2.eq
        .mockReturnValueOnce(updateBuilder2) // First eq(id) returns this for chaining
        .mockResolvedValueOnce({ error: null }); // Second eq(prd_id) returns promise

      const mockFrom = vi.fn();
      mockFrom
        .mockReturnValueOnce(prdCheckBuilder) // PRD check
        .mockReturnValueOnce(questionValidationBuilder) // Question validation
        .mockReturnValueOnce(updateBuilder1) // First update
        .mockReturnValueOnce(updateBuilder2); // Second update

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const command = createMockCommand([
        { questionId: mockQuestionId1, text: "Answer 1" },
        { questionId: mockQuestionId2, text: "Answer 2" },
      ]);

      await expect(submitAnswers(mockSupabaseWithFrom, mockPrdId, command)).resolves.not.toThrow();

      // Verify updates were called sequentially
      expect(updateBuilder1.update).toHaveBeenCalledWith({ answer: "Answer 1" });
      expect(updateBuilder2.update).toHaveBeenCalledWith({ answer: "Answer 2" });
      // Verify eq calls
      expect(updateBuilder1.eq).toHaveBeenCalledWith("id", mockQuestionId1);
      expect(updateBuilder1.eq).toHaveBeenCalledWith("prd_id", mockPrdId);
      expect(updateBuilder2.eq).toHaveBeenCalledWith("id", mockQuestionId2);
      expect(updateBuilder2.eq).toHaveBeenCalledWith("prd_id", mockPrdId);
    });

    it("should throw PrdNotFoundError when PRD doesn't exist", async () => {
      const prdCheckBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const command = createMockCommand([{ questionId: mockQuestionId1, text: "Answer" }]);

      await expect(submitAnswers(mockSupabaseWithFrom, mockPrdId, command)).rejects.toThrow(PrdNotFoundError);
    });

    it("should throw PrdQuestionConflictError when PRD not in planning status", async () => {
      const prdCheckBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId, status: "planning_review" },
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const command = createMockCommand([{ questionId: mockQuestionId1, text: "Answer" }]);

      await expect(submitAnswers(mockSupabaseWithFrom, mockPrdId, command)).rejects.toThrow(PrdQuestionConflictError);
    });

    it("should throw PrdQuestionNotFoundError for invalid question IDs", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const questionValidationBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId, status: "planning" },
        error: null,
      });

      // Return only one question (invalid question ID doesn't exist)
      // Pattern: from().select("id").eq(prd_id).in(ids) - eq() returns this, in() returns promise
      questionValidationBuilder.select.mockReturnThis(); // select() returns this for chaining
      questionValidationBuilder.eq.mockReturnThis(); // eq(prd_id) returns this for chaining
      questionValidationBuilder.in.mockResolvedValue({
        data: [{ id: mockQuestionId1 }],
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(questionValidationBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const command = createMockCommand([
        { questionId: mockQuestionId1, text: "Answer 1" },
        { questionId: "invalid-id", text: "Answer 2" },
      ]);

      await expect(submitAnswers(mockSupabaseWithFrom, mockPrdId, command)).rejects.toThrow(PrdQuestionNotFoundError);

      // Set up fresh mocks for second assertion
      const prdCheckBuilder2 = createMockQueryBuilder();
      const questionValidationBuilder2 = createMockQueryBuilder();

      prdCheckBuilder2.single.mockResolvedValue({
        data: { id: mockPrdId, status: "planning" },
        error: null,
      });

      questionValidationBuilder2.select.mockReturnThis();
      questionValidationBuilder2.eq.mockReturnThis();
      questionValidationBuilder2.in.mockResolvedValue({
        data: [{ id: mockQuestionId1 }],
        error: null,
      });

      const mockFrom2 = vi.fn();
      mockFrom2.mockReturnValueOnce(prdCheckBuilder2).mockReturnValueOnce(questionValidationBuilder2);

      const mockSupabaseWithFrom2 = {
        from: mockFrom2,
      } as unknown as SupabaseClient;

      await expect(submitAnswers(mockSupabaseWithFrom2, mockPrdId, command)).rejects.toThrow(
        "Questions not found or do not belong to this PRD"
      );
    });

    it("should throw PrdQuestionNotFoundError when questions don't belong to PRD", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const questionValidationBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId, status: "planning" },
        error: null,
      });

      // Return empty array (questions don't belong to PRD)
      // Pattern: from().select("id").eq(prd_id).in(ids) - eq() returns this, in() returns promise
      questionValidationBuilder.select.mockReturnThis(); // select() returns this for chaining
      questionValidationBuilder.eq.mockReturnThis(); // eq(prd_id) returns this for chaining
      questionValidationBuilder.in.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(questionValidationBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const command = createMockCommand([{ questionId: mockQuestionId1, text: "Answer" }]);

      await expect(submitAnswers(mockSupabaseWithFrom, mockPrdId, command)).rejects.toThrow(PrdQuestionNotFoundError);
    });

    it("should validate all questions belong to PRD before updating", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const questionValidationBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId, status: "planning" },
        error: null,
      });

      // Pattern: from().select("id").eq(prd_id).in(ids) - eq() returns this, in() returns promise
      questionValidationBuilder.select.mockReturnThis(); // select() returns this for chaining
      questionValidationBuilder.eq.mockReturnThis(); // eq(prd_id) returns this for chaining
      questionValidationBuilder.in.mockResolvedValue({
        data: [{ id: mockQuestionId1 }],
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(questionValidationBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const command = createMockCommand([
        { questionId: mockQuestionId1, text: "Answer 1" },
        { questionId: mockQuestionId2, text: "Answer 2" },
      ]);

      await expect(submitAnswers(mockSupabaseWithFrom, mockPrdId, command)).rejects.toThrow(PrdQuestionNotFoundError);

      // Verify no updates were attempted
      expect(mockFrom).toHaveBeenCalledTimes(2); // Only PRD check and validation
    });

    it("should throw PrdQuestionUpdateError on database update failure", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const questionValidationBuilder = createMockQueryBuilder();
      const updateBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId, status: "planning" },
        error: null,
      });

      // Pattern: from().select("id").eq(prd_id).in(ids) - eq() returns this, in() returns promise
      questionValidationBuilder.select.mockReturnThis(); // select() returns this for chaining
      questionValidationBuilder.eq.mockReturnThis(); // eq(prd_id) returns this for chaining
      questionValidationBuilder.in.mockResolvedValue({
        data: [{ id: mockQuestionId1 }],
        error: null,
      });

      // First eq(id) returns this, second eq(prd_id) returns promise with error
      updateBuilder.eq
        .mockReturnValueOnce(updateBuilder) // First eq(id) returns this for chaining
        .mockResolvedValueOnce({ error: { message: "Update failed" } }); // Second eq(prd_id) returns promise with error

      const mockFrom = vi.fn();
      mockFrom
        .mockReturnValueOnce(prdCheckBuilder)
        .mockReturnValueOnce(questionValidationBuilder)
        .mockReturnValueOnce(updateBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const command = createMockCommand([{ questionId: mockQuestionId1, text: "Answer" }]);

      await expect(submitAnswers(mockSupabaseWithFrom, mockPrdId, command)).rejects.toThrow(PrdQuestionUpdateError);

      // Set up fresh mocks for second assertion
      const prdCheckBuilder2 = createMockQueryBuilder();
      const questionValidationBuilder2 = createMockQueryBuilder();
      const updateBuilder2 = createMockQueryBuilder();

      prdCheckBuilder2.single.mockResolvedValue({
        data: { id: mockPrdId, status: "planning" },
        error: null,
      });

      questionValidationBuilder2.select.mockReturnThis();
      questionValidationBuilder2.eq.mockReturnThis();
      questionValidationBuilder2.in.mockResolvedValue({
        data: [{ id: mockQuestionId1 }],
        error: null,
      });

      updateBuilder2.eq
        .mockReturnValueOnce(updateBuilder2)
        .mockResolvedValueOnce({ error: { message: "Update failed" } });

      const mockFrom2 = vi.fn();
      mockFrom2
        .mockReturnValueOnce(prdCheckBuilder2)
        .mockReturnValueOnce(questionValidationBuilder2)
        .mockReturnValueOnce(updateBuilder2);

      const mockSupabaseWithFrom2 = {
        from: mockFrom2,
      } as unknown as SupabaseClient;

      await expect(submitAnswers(mockSupabaseWithFrom2, mockPrdId, command)).rejects.toThrow("Update failed");
    });
  });

  describe("generateNextQuestions", () => {
    beforeEach(() => {
      // Clear mock before each test
      mockGetStructuredResponse.mockClear();
    });

    const mockPrdData = {
      id: mockPrdId,
      status: "planning" as const,
      main_problem: "Test problem",
      in_scope: "In scope",
      out_of_scope: "Out of scope",
      success_criteria: "Success criteria",
    };

    const mockAiResponse = {
      questions: [
        { question: "Question 1?", recommendation: "Recommendation 1" },
        { question: "Question 2?", recommendation: "Recommendation 2" },
      ],
    };

    it("should generate questions successfully for first round (round 1)", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const previousQuestionsBuilder = createMockQueryBuilder();
      const insertBuilder = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(0); // No rounds yet

      prdCheckBuilder.single.mockResolvedValue({
        data: mockPrdData,
        error: null,
      });

      // No previous questions for first round
      // Pattern: from().select("*").eq(prd_id).order().order() - select/eq/order return this, final order returns promise
      previousQuestionsBuilder.select.mockReturnThis(); // select() returns this
      previousQuestionsBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      previousQuestionsBuilder.order
        .mockReturnValueOnce(previousQuestionsBuilder) // First order() returns this
        .mockResolvedValueOnce({ data: [], error: null }); // Second order() returns promise

      const insertedQuestions = [
        createMockQuestionRow({
          id: mockQuestionId1,
          round_number: 1,
          question: "Question 1?\n\nRecommendation: Recommendation 1",
        }),
        createMockQuestionRow({
          id: mockQuestionId2,
          round_number: 1,
          question: "Question 2?\n\nRecommendation: Recommendation 2",
        }),
      ];

      insertBuilder.select.mockResolvedValue({
        data: insertedQuestions,
        error: null,
      });

      mockGetStructuredResponse.mockResolvedValue(mockAiResponse);

      const mockFrom = vi.fn();
      mockFrom
        .mockReturnValueOnce(prdCheckBuilder)
        .mockReturnValueOnce(previousQuestionsBuilder)
        .mockReturnValueOnce(insertBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await generateNextQuestions(mockSupabaseWithFrom, mockPrdId);

      expect(result).toHaveLength(2);
      expect(result[0].roundNumber).toBe(1);
      expect(result[0].question).toContain("Question 1?");
      expect(result[0].question).toContain("Recommendation: Recommendation 1");
      expect(getCurrentRoundNumberSpy).toHaveBeenCalledWith(mockSupabaseWithFrom, mockPrdId);
      expect(mockGetStructuredResponse).toHaveBeenCalled();
    });

    it("should generate questions for subsequent rounds (round 2+)", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const previousQuestionsBuilder = createMockQueryBuilder();
      const insertBuilder = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(1); // Already has round 1

      prdCheckBuilder.single.mockResolvedValue({
        data: mockPrdData,
        error: null,
      });

      const previousQuestions = [createMockQuestionRow({ round_number: 1, answer: "Previous answer" })];

      // Pattern: from().select().eq(prd_id).order().order() - both order() return this, final returns promise
      previousQuestionsBuilder.order
        .mockReturnValueOnce(previousQuestionsBuilder) // First order() returns this
        .mockResolvedValueOnce({ data: previousQuestions, error: null }); // Second order() returns promise

      const insertedQuestions = [
        createMockQuestionRow({
          id: mockQuestionId1,
          round_number: 2,
          question: "Question 1?\n\nRecommendation: Recommendation 1",
        }),
      ];

      insertBuilder.select.mockResolvedValue({
        data: insertedQuestions,
        error: null,
      });

      mockGetStructuredResponse.mockResolvedValue(mockAiResponse);

      const mockFrom = vi.fn();
      mockFrom
        .mockReturnValueOnce(prdCheckBuilder)
        .mockReturnValueOnce(previousQuestionsBuilder)
        .mockReturnValueOnce(insertBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await generateNextQuestions(mockSupabaseWithFrom, mockPrdId);

      expect(result[0].roundNumber).toBe(2);
      // Verify previous Q&A was included in prompt
      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.userPrompt).toContain("Previous answer");
    });

    it("should calculate next round number correctly (current + 1)", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const previousQuestionsBuilder = createMockQueryBuilder();
      const insertBuilder = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(3);

      prdCheckBuilder.single.mockResolvedValue({
        data: mockPrdData,
        error: null,
      });

      // Pattern: from().select("*").eq(prd_id).order().order() - select/eq/order return this, final order returns promise
      previousQuestionsBuilder.select.mockReturnThis(); // select() returns this
      previousQuestionsBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      previousQuestionsBuilder.order
        .mockReturnValueOnce(previousQuestionsBuilder) // First order() returns this
        .mockResolvedValueOnce({ data: [], error: null }); // Second order() returns promise

      const insertedQuestions = [
        createMockQuestionRow({ round_number: 4 }), // Should be 4 (3 + 1)
      ];

      insertBuilder.select.mockResolvedValue({
        data: insertedQuestions,
        error: null,
      });

      mockGetStructuredResponse.mockResolvedValue(mockAiResponse);

      const mockFrom = vi.fn();
      mockFrom
        .mockReturnValueOnce(prdCheckBuilder)
        .mockReturnValueOnce(previousQuestionsBuilder)
        .mockReturnValueOnce(insertBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await generateNextQuestions(mockSupabaseWithFrom, mockPrdId);

      // Verify insert was called with round_number 4
      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            round_number: 4,
          }),
        ])
      );
    });

    it("should transform AI response (combines question + recommendation)", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const previousQuestionsBuilder = createMockQueryBuilder();
      const insertBuilder = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(0);

      prdCheckBuilder.single.mockResolvedValue({
        data: mockPrdData,
        error: null,
      });

      // Pattern: from().select("*").eq(prd_id).order().order() - select/eq/order return this, final order returns promise
      previousQuestionsBuilder.select.mockReturnThis(); // select() returns this
      previousQuestionsBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      previousQuestionsBuilder.order
        .mockReturnValueOnce(previousQuestionsBuilder) // First order() returns this
        .mockResolvedValueOnce({ data: [], error: null }); // Second order() returns promise

      insertBuilder.select.mockResolvedValue({
        data: [],
        error: null,
      });

      mockGetStructuredResponse.mockResolvedValue(mockAiResponse);

      const mockFrom = vi.fn();
      mockFrom
        .mockReturnValueOnce(prdCheckBuilder)
        .mockReturnValueOnce(previousQuestionsBuilder)
        .mockReturnValueOnce(insertBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await generateNextQuestions(mockSupabaseWithFrom, mockPrdId);

      // Verify insert was called with combined format
      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            question: "Question 1?\n\nRecommendation: Recommendation 1",
          }),
        ])
      );
    });

    it("should set answer to null for new questions", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const previousQuestionsBuilder = createMockQueryBuilder();
      const insertBuilder = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(0);

      prdCheckBuilder.single.mockResolvedValue({
        data: mockPrdData,
        error: null,
      });

      // Pattern: from().select("*").eq(prd_id).order().order() - select/eq/order return this, final order returns promise
      previousQuestionsBuilder.select.mockReturnThis(); // select() returns this
      previousQuestionsBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      previousQuestionsBuilder.order
        .mockReturnValueOnce(previousQuestionsBuilder) // First order() returns this
        .mockResolvedValueOnce({ data: [], error: null }); // Second order() returns promise

      insertBuilder.select.mockResolvedValue({
        data: [],
        error: null,
      });

      mockGetStructuredResponse.mockResolvedValue(mockAiResponse);

      const mockFrom = vi.fn();
      mockFrom
        .mockReturnValueOnce(prdCheckBuilder)
        .mockReturnValueOnce(previousQuestionsBuilder)
        .mockReturnValueOnce(insertBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await generateNextQuestions(mockSupabaseWithFrom, mockPrdId);

      // Verify insert was called with answer: null
      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            answer: null,
          }),
        ])
      );
    });

    it("should throw PrdNotFoundError when PRD doesn't exist", async () => {
      const prdCheckBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await expect(generateNextQuestions(mockSupabaseWithFrom, mockPrdId)).rejects.toThrow(PrdNotFoundError);
    });

    it("should throw PrdQuestionGenerationError when not in planning status", async () => {
      const prdCheckBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: { ...mockPrdData, status: "planning_review" },
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await expect(generateNextQuestions(mockSupabaseWithFrom, mockPrdId)).rejects.toThrow(PrdQuestionGenerationError);
    });

    it("should throw PrdQuestionAiGenerationError on NetworkError from OpenRouter", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const previousQuestionsBuilder = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(0);

      prdCheckBuilder.single.mockResolvedValue({
        data: mockPrdData,
        error: null,
      });

      // Pattern: from().select("*").eq(prd_id).order().order() - select/eq/order return this, final order returns promise
      previousQuestionsBuilder.select.mockReturnThis(); // select() returns this
      previousQuestionsBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      previousQuestionsBuilder.order
        .mockReturnValueOnce(previousQuestionsBuilder) // First order() returns this
        .mockResolvedValueOnce({ data: [], error: null }); // Second order() returns promise

      mockGetStructuredResponse.mockRejectedValue(new NetworkError("Network failure"));

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(previousQuestionsBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await expect(generateNextQuestions(mockSupabaseWithFrom, mockPrdId)).rejects.toThrow(
        PrdQuestionAiGenerationError
      );

      // Set up fresh mocks for second assertion
      const prdCheckBuilder2 = createMockQueryBuilder();
      const previousQuestionsBuilder2 = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(0);

      prdCheckBuilder2.single.mockResolvedValue({
        data: mockPrdData,
        error: null,
      });

      previousQuestionsBuilder2.select.mockReturnThis();
      previousQuestionsBuilder2.eq.mockReturnThis();
      previousQuestionsBuilder2.order
        .mockReturnValueOnce(previousQuestionsBuilder2)
        .mockResolvedValueOnce({ data: [], error: null });

      mockGetStructuredResponse.mockRejectedValue(new NetworkError("Network failure"));

      const mockFrom2 = vi.fn();
      mockFrom2.mockReturnValueOnce(prdCheckBuilder2).mockReturnValueOnce(previousQuestionsBuilder2);

      const mockSupabaseWithFrom2 = {
        from: mockFrom2,
      } as unknown as SupabaseClient;

      await expect(generateNextQuestions(mockSupabaseWithFrom2, mockPrdId)).rejects.toThrow(
        "AI service error: Network failure"
      );
    });

    it("should throw PrdQuestionAiGenerationError on ApiError from OpenRouter", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const previousQuestionsBuilder = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(0);

      prdCheckBuilder.single.mockResolvedValue({
        data: mockPrdData,
        error: null,
      });

      // Pattern: from().select("*").eq(prd_id).order().order() - select/eq/order return this, final order returns promise
      previousQuestionsBuilder.select.mockReturnThis(); // select() returns this
      previousQuestionsBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      previousQuestionsBuilder.order
        .mockReturnValueOnce(previousQuestionsBuilder) // First order() returns this
        .mockResolvedValueOnce({ data: [], error: null }); // Second order() returns promise

      mockGetStructuredResponse.mockRejectedValue(new ApiError("API error", 500));

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(previousQuestionsBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await expect(generateNextQuestions(mockSupabaseWithFrom, mockPrdId)).rejects.toThrow(
        PrdQuestionAiGenerationError
      );
    });

    it("should throw PrdQuestionAiGenerationError on ParsingError from OpenRouter", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const previousQuestionsBuilder = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(0);

      prdCheckBuilder.single.mockResolvedValue({
        data: mockPrdData,
        error: null,
      });

      // Pattern: from().select("*").eq(prd_id).order().order() - select/eq/order return this, final order returns promise
      previousQuestionsBuilder.select.mockReturnThis(); // select() returns this
      previousQuestionsBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      previousQuestionsBuilder.order
        .mockReturnValueOnce(previousQuestionsBuilder) // First order() returns this
        .mockResolvedValueOnce({ data: [], error: null }); // Second order() returns promise

      mockGetStructuredResponse.mockRejectedValue(new ParsingError("Parse error"));

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(previousQuestionsBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await expect(generateNextQuestions(mockSupabaseWithFrom, mockPrdId)).rejects.toThrow(
        PrdQuestionAiGenerationError
      );
    });

    it("should throw PrdQuestionAiGenerationError on ValidationError from OpenRouter", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const previousQuestionsBuilder = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(0);

      prdCheckBuilder.single.mockResolvedValue({
        data: mockPrdData,
        error: null,
      });

      // Pattern: from().select("*").eq(prd_id).order().order() - select/eq/order return this, final order returns promise
      previousQuestionsBuilder.select.mockReturnThis(); // select() returns this
      previousQuestionsBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      previousQuestionsBuilder.order
        .mockReturnValueOnce(previousQuestionsBuilder) // First order() returns this
        .mockResolvedValueOnce({ data: [], error: null }); // Second order() returns promise

      mockGetStructuredResponse.mockRejectedValue(new ValidationError("Validation error"));

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder).mockReturnValueOnce(previousQuestionsBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await expect(generateNextQuestions(mockSupabaseWithFrom, mockPrdId)).rejects.toThrow(
        PrdQuestionAiGenerationError
      );
    });

    it("should handle database insertion errors", async () => {
      const prdCheckBuilder = createMockQueryBuilder();
      const previousQuestionsBuilder = createMockQueryBuilder();
      const insertBuilder = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(0);

      prdCheckBuilder.single.mockResolvedValue({
        data: mockPrdData,
        error: null,
      });

      // Pattern: from().select("*").eq(prd_id).order().order() - select/eq/order return this, final order returns promise
      previousQuestionsBuilder.select.mockReturnThis(); // select() returns this
      previousQuestionsBuilder.eq.mockReturnThis(); // eq(prd_id) returns this
      previousQuestionsBuilder.order
        .mockReturnValueOnce(previousQuestionsBuilder) // First order() returns this
        .mockResolvedValueOnce({ data: [], error: null }); // Second order() returns promise

      insertBuilder.select.mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });

      mockGetStructuredResponse.mockResolvedValue(mockAiResponse);

      const mockFrom = vi.fn();
      mockFrom
        .mockReturnValueOnce(prdCheckBuilder)
        .mockReturnValueOnce(previousQuestionsBuilder)
        .mockReturnValueOnce(insertBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await expect(generateNextQuestions(mockSupabaseWithFrom, mockPrdId)).rejects.toThrow(PrdQuestionFetchingError);

      // Set up fresh mocks for second assertion
      const prdCheckBuilder2 = createMockQueryBuilder();
      const previousQuestionsBuilder2 = createMockQueryBuilder();
      const insertBuilder2 = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(0);

      prdCheckBuilder2.single.mockResolvedValue({
        data: mockPrdData,
        error: null,
      });

      previousQuestionsBuilder2.select.mockReturnThis();
      previousQuestionsBuilder2.eq.mockReturnThis();
      previousQuestionsBuilder2.order
        .mockReturnValueOnce(previousQuestionsBuilder2)
        .mockResolvedValueOnce({ data: [], error: null });

      insertBuilder2.select.mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });

      mockGetStructuredResponse.mockResolvedValue(mockAiResponse);

      const mockFrom2 = vi.fn();
      mockFrom2
        .mockReturnValueOnce(prdCheckBuilder2)
        .mockReturnValueOnce(previousQuestionsBuilder2)
        .mockReturnValueOnce(insertBuilder2);

      const mockSupabaseWithFrom2 = {
        from: mockFrom2,
      } as unknown as SupabaseClient;

      await expect(generateNextQuestions(mockSupabaseWithFrom2, mockPrdId)).rejects.toThrow("Insert failed");
    });
  });

  describe("getLatestPrdQuestionRound", () => {
    it("should return questions from latest round successfully", async () => {
      // getLatestPrdQuestionRound makes PRD check, then calls getPrdQuestions which also makes PRD check
      const prdCheckBuilder1 = createMockQueryBuilder(); // PRD check in getLatestPrdQuestionRound
      const prdCheckBuilder2 = createMockQueryBuilder(); // PRD check in getPrdQuestions
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(2); // Latest round is 2

      prdCheckBuilder1.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      prdCheckBuilder2.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      // getPrdQuestions internally makes PRD check, count, and data queries
      // First, it checks PRD exists (already mocked above)
      // Then count query: from().select("*", { count: "exact", head: true }).eq(prd_id).eq(round_number)
      countBuilder.select.mockReturnThis(); // select() returns this
      countBuilder.eq
        .mockReturnValueOnce(countBuilder) // First eq(prd_id) returns this
        .mockResolvedValueOnce({ count: 2, error: null }); // Second eq(round_number) returns promise

      const round2Questions = [
        createMockQuestionRow({ round_number: 2 }),
        createMockQuestionRow({ id: mockQuestionId2, round_number: 2 }),
      ];

      // Data query: select("*").eq(prd_id).eq(round_number).order().range()
      dataBuilder.select.mockReturnThis(); // select() returns this
      dataBuilder.eq
        .mockReturnValueOnce(dataBuilder) // First eq(prd_id) returns this
        .mockReturnValueOnce(dataBuilder); // Second eq(round_number) returns this
      dataBuilder.order.mockReturnThis(); // order() returns this
      dataBuilder.range.mockResolvedValue({
        data: round2Questions,
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom
        .mockReturnValueOnce(prdCheckBuilder1) // PRD check in getLatestPrdQuestionRound
        .mockReturnValueOnce(prdCheckBuilder2) // PRD check in getPrdQuestions
        .mockReturnValueOnce(countBuilder) // Count query from getPrdQuestions
        .mockReturnValueOnce(dataBuilder); // Data query from getPrdQuestions

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getLatestPrdQuestionRound(mockSupabaseWithFrom, mockPrdId);

      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].roundNumber).toBe(2);
      expect(getCurrentRoundNumberSpy).toHaveBeenCalledWith(mockSupabaseWithFrom, mockPrdId);
    });

    it("should return empty array when no rounds exist (round 0)", async () => {
      const prdCheckBuilder = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(0);

      prdCheckBuilder.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getLatestPrdQuestionRound(mockSupabaseWithFrom, mockPrdId);

      expect(result.questions).toEqual([]);
      expect(getCurrentRoundNumberSpy).toHaveBeenCalledWith(mockSupabaseWithFrom, mockPrdId);
    });

    it("should throw PrdNotFoundError when PRD doesn't exist", async () => {
      const prdCheckBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await expect(getLatestPrdQuestionRound(mockSupabaseWithFrom, mockPrdId)).rejects.toThrow(PrdNotFoundError);
    });

    it("should throw PrdQuestionFetchingError on database errors", async () => {
      const prdCheckBuilder = createMockQueryBuilder();

      prdCheckBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "500", message: "Database error" },
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(prdCheckBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await expect(getLatestPrdQuestionRound(mockSupabaseWithFrom, mockPrdId)).rejects.toThrow(
        PrdQuestionFetchingError
      );
    });

    it("should use getPrdQuestions internally (integration test)", async () => {
      // getLatestPrdQuestionRound makes PRD check, then calls getPrdQuestions which also makes PRD check
      const prdCheckBuilder1 = createMockQueryBuilder(); // PRD check in getLatestPrdQuestionRound
      const prdCheckBuilder2 = createMockQueryBuilder(); // PRD check in getPrdQuestions
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      getCurrentRoundNumberSpy.mockResolvedValue(1);

      prdCheckBuilder1.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      prdCheckBuilder2.single.mockResolvedValue({
        data: { id: mockPrdId },
        error: null,
      });

      // Count query: select().eq(prd_id).eq(round_number) - second eq returns promise
      countBuilder.select.mockReturnThis(); // select() returns this
      countBuilder.eq
        .mockReturnValueOnce(countBuilder) // First eq(prd_id) returns this
        .mockResolvedValueOnce({ count: 1, error: null }); // Second eq(round_number) returns promise

      // Data query: select("*").eq(prd_id).eq(round_number).order().range()
      dataBuilder.select.mockReturnThis(); // select() returns this
      dataBuilder.eq
        .mockReturnValueOnce(dataBuilder) // First eq(prd_id) returns this
        .mockReturnValueOnce(dataBuilder); // Second eq(round_number) returns this
      dataBuilder.order.mockReturnThis(); // order() returns this
      dataBuilder.range.mockResolvedValue({
        data: [createMockQuestionRow({ round_number: 1 })],
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom
        .mockReturnValueOnce(prdCheckBuilder1) // PRD check in getLatestPrdQuestionRound
        .mockReturnValueOnce(prdCheckBuilder2) // PRD check in getPrdQuestions
        .mockReturnValueOnce(countBuilder) // Count query from getPrdQuestions
        .mockReturnValueOnce(dataBuilder); // Data query from getPrdQuestions

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getLatestPrdQuestionRound(mockSupabaseWithFrom, mockPrdId);

      // Verify getPrdQuestions was called internally (by checking round filter was applied)
      expect(countBuilder.eq).toHaveBeenCalledWith("round_number", 1);
      expect(dataBuilder.eq).toHaveBeenCalledWith("round_number", 1);
      expect(result.questions).toHaveLength(1);
    });
  });
});
