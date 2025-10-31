import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import type { PrdDto, PrdQuestionDto, PaginatedPrdQuestionsDto } from "@/types";
import * as prdsModule from "@/lib/services/prds";
import * as prdQuestionModule from "@/lib/services/prdQuestion.service";
import {
  generateSummary,
  updateSummary,
  deleteSummary,
  PrdSummaryGenerationError,
  PrdSummaryConflictError,
  PrdSummaryUpdateError,
} from "@/lib/services/prdSummary.service";
import { PrdNotFoundError } from "@/lib/services/prds";
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
const mockUserId = "00000000-0000-0000-0000-000000000002";
const mockQuestionId1 = "00000000-0000-0000-0000-000000000010";
const mockQuestionId2 = "00000000-0000-0000-0000-000000000011";

const createMockPrdDto = (overrides?: Partial<PrdDto>): PrdDto => ({
  id: mockPrdId,
  userId: mockUserId,
  name: "Test PRD",
  mainProblem: "Test problem",
  inScope: "In scope",
  outOfScope: "Out of scope",
  successCriteria: "Success criteria",
  status: "planning",
  summary: null,
  content: null,
  currentRoundNumber: 1,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

const createMockQuestionDto = (overrides?: Partial<PrdQuestionDto>): PrdQuestionDto => ({
  id: mockQuestionId1,
  prdId: mockPrdId,
  roundNumber: 1,
  question: "Test question?",
  answer: "Test answer",
  createdAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

// Helper to create a chainable Supabase query builder mock
const createMockQueryBuilder = () => {
  const builder = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return builder;
};

describe("prdSummary.service.ts", () => {
  let mockSupabase: SupabaseClient;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  let getPrdByIdSpy: ReturnType<typeof vi.spyOn> & {
    mockResolvedValue: (value: PrdDto) => void;
  };
  let getPrdQuestionsSpy: ReturnType<typeof vi.spyOn> & {
    mockResolvedValue: (value: PaginatedPrdQuestionsDto) => void;
  };

  beforeEach(() => {
    mockQueryBuilder = createMockQueryBuilder();
    mockSupabase = mockQueryBuilder as unknown as SupabaseClient;

    // Reset call history for query builder methods
    Object.values(mockQueryBuilder).forEach((fn) => {
      if (typeof fn === "function" && "mockClear" in fn) {
        (fn as { mockClear: () => void }).mockClear();
      }
    });

    // Setup spies for dependencies
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPrdByIdSpy = vi.spyOn(prdsModule, "getPrdById" as any) as ReturnType<typeof vi.spyOn> & {
      mockResolvedValue: (value: PrdDto) => void;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPrdQuestionsSpy = vi.spyOn(prdQuestionModule, "getPrdQuestions" as any) as ReturnType<typeof vi.spyOn> & {
      mockResolvedValue: (value: PaginatedPrdQuestionsDto) => void;
    };

    // Reset OpenRouter mock
    mockGetStructuredResponse.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Error Classes", () => {
    it("PrdSummaryGenerationError should have correct name and message", () => {
      const error = new PrdSummaryGenerationError();
      expect(error.name).toBe("PrdSummaryGenerationError");
      expect(error.message).toBe("Unable to generate PRD summary");
    });

    it("PrdSummaryGenerationError should accept custom message", () => {
      const error = new PrdSummaryGenerationError("Custom message");
      expect(error.message).toBe("Custom message");
    });

    it("PrdSummaryConflictError should have correct name and message", () => {
      const error = new PrdSummaryConflictError();
      expect(error.name).toBe("PrdSummaryConflictError");
      expect(error.message).toBe("PRD status conflict for summary operation");
    });

    it("PrdSummaryConflictError should accept custom message", () => {
      const error = new PrdSummaryConflictError("Custom message");
      expect(error.message).toBe("Custom message");
    });

    it("PrdSummaryUpdateError should have correct name and message", () => {
      const error = new PrdSummaryUpdateError();
      expect(error.name).toBe("PrdSummaryUpdateError");
      expect(error.message).toBe("Unable to update PRD summary");
    });

    it("PrdSummaryUpdateError should accept custom message", () => {
      const error = new PrdSummaryUpdateError("Custom message");
      expect(error.message).toBe("Custom message");
    });
  });

  describe("generateSummary", () => {
    const mockSummary = "Generated summary content";
    const mockQuestions: PrdQuestionDto[] = [
      createMockQuestionDto({ id: mockQuestionId1, answer: "Answer 1" }),
      createMockQuestionDto({ id: mockQuestionId2, answer: "Answer 2" }),
    ];

    it("should successfully generate summary with valid data", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: mockQuestions,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 2,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);
      mockGetStructuredResponse.mockResolvedValue({ summary: mockSummary });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      const result = await generateSummary(mockSupabase, mockPrdId);

      expect(result).toBe(mockSummary);
      expect(getPrdByIdSpy).toHaveBeenCalledWith(mockSupabase, mockPrdId);
      expect(getPrdQuestionsSpy).toHaveBeenCalledWith(mockSupabase, mockPrdId, 1, 1000);
      expect(mockGetStructuredResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonSchema: expect.objectContaining({
            name: "prd_summary_response",
            schema: expect.objectContaining({
              properties: expect.objectContaining({
                summary: expect.any(Object),
              }),
            }),
          }),
          params: {
            temperature: 0.7,
          },
        })
      );
      expect(mockQueryBuilder.from).toHaveBeenCalledWith("prds");
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        summary: mockSummary,
        status: "planning_review",
        updated_at: expect.any(String),
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", mockPrdId);
    });

    it("should throw PrdSummaryConflictError when PRD not in planning status", async () => {
      const mockPrd = createMockPrdDto({ status: "planning_review" });

      getPrdByIdSpy.mockResolvedValue(mockPrd);

      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(PrdSummaryConflictError);
      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(
        "PRD must be in planning status to generate summary"
      );
      expect(getPrdQuestionsSpy).not.toHaveBeenCalled();
      expect(mockGetStructuredResponse).not.toHaveBeenCalled();
    });

    it("should throw PrdSummaryConflictError when PRD has no questions", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: [],
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 0,
          totalPages: 0,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);

      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(PrdSummaryConflictError);
      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(
        "Cannot generate summary: PRD has no questions"
      );
      expect(mockGetStructuredResponse).not.toHaveBeenCalled();
    });

    it("should throw PrdSummaryConflictError when PRD has unanswered questions", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const unansweredQuestions: PrdQuestionDto[] = [
        createMockQuestionDto({ id: mockQuestionId1, answer: "Answer 1" }),
        createMockQuestionDto({ id: mockQuestionId2, answer: null }),
      ];
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: unansweredQuestions,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 2,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);

      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(PrdSummaryConflictError);
      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(
        "Cannot generate summary: PRD has unanswered questions"
      );
      expect(mockGetStructuredResponse).not.toHaveBeenCalled();
    });

    it("should throw PrdNotFoundError when PRD doesn't exist", async () => {
      getPrdByIdSpy.mockRejectedValue(new PrdNotFoundError());

      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(PrdNotFoundError);
      expect(getPrdQuestionsSpy).not.toHaveBeenCalled();
      expect(mockGetStructuredResponse).not.toHaveBeenCalled();
    });

    it("should handle NetworkError from AI service and wrap in PrdSummaryGenerationError", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: mockQuestions,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 2,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);
      mockGetStructuredResponse.mockRejectedValue(new NetworkError("Network error"));

      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(PrdSummaryGenerationError);
      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(
        "Failed to generate summary with AI: Network error"
      );
    });

    it("should handle ApiError from AI service and wrap in PrdSummaryGenerationError", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: mockQuestions,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 2,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);
      mockGetStructuredResponse.mockRejectedValue(new ApiError("API error", 500));

      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(PrdSummaryGenerationError);
      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(
        "Failed to generate summary with AI: API error"
      );
    });

    it("should handle ParsingError from AI service and wrap in PrdSummaryGenerationError", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: mockQuestions,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 2,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);
      mockGetStructuredResponse.mockRejectedValue(new ParsingError("Parsing error"));

      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(PrdSummaryGenerationError);
      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(
        "Failed to generate summary with AI: Parsing error"
      );
    });

    it("should handle ValidationError from AI service and wrap in PrdSummaryGenerationError", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: mockQuestions,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 2,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);
      mockGetStructuredResponse.mockRejectedValue(new ValidationError("Validation error"));

      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(PrdSummaryGenerationError);
      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(
        "Failed to generate summary with AI: Validation error"
      );
    });

    it("should handle unknown error from AI service and wrap in PrdSummaryGenerationError", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: mockQuestions,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 2,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);
      mockGetStructuredResponse.mockRejectedValue("Unknown error");

      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(PrdSummaryGenerationError);
      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(
        "Failed to generate summary with AI: Unknown error occurred"
      );
    });

    it("should throw PrdSummaryGenerationError on database update failure", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: mockQuestions,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 2,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);
      mockGetStructuredResponse.mockResolvedValue({ summary: mockSummary });
      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(PrdSummaryGenerationError);
      await expect(generateSummary(mockSupabase, mockPrdId)).rejects.toThrow(
        "Failed to update PRD with summary: Database error"
      );
    });

    it("should update PRD status from planning to planning_review", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: mockQuestions,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 2,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);
      mockGetStructuredResponse.mockResolvedValue({ summary: mockSummary });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generateSummary(mockSupabase, mockPrdId);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "planning_review",
        })
      );
    });

    it("should update updated_at timestamp", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: mockQuestions,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 2,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);
      mockGetStructuredResponse.mockResolvedValue({ summary: mockSummary });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      const beforeUpdate = new Date().toISOString();
      await generateSummary(mockSupabase, mockPrdId);
      const afterUpdate = new Date().toISOString();

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        })
      );

      const updateCall = (mockQueryBuilder.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const updatedAt = new Date(updateCall.updated_at).getTime();
      expect(updatedAt).toBeGreaterThanOrEqual(new Date(beforeUpdate).getTime());
      expect(updatedAt).toBeLessThanOrEqual(new Date(afterUpdate).getTime());
    });

    it("should handle single question with answer", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const singleQuestion: PrdQuestionDto[] = [createMockQuestionDto({ answer: "Single answer" })];
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: singleQuestion,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 1,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);
      mockGetStructuredResponse.mockResolvedValue({ summary: mockSummary });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      const result = await generateSummary(mockSupabase, mockPrdId);

      expect(result).toBe(mockSummary);
      expect(mockGetStructuredResponse).toHaveBeenCalled();
    });

    it("should handle multiple rounds of questions", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const multiRoundQuestions: PrdQuestionDto[] = [
        createMockQuestionDto({ id: mockQuestionId1, roundNumber: 1, answer: "Round 1 answer" }),
        createMockQuestionDto({ id: mockQuestionId2, roundNumber: 2, answer: "Round 2 answer" }),
      ];
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: multiRoundQuestions,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 2,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);
      mockGetStructuredResponse.mockResolvedValue({ summary: mockSummary });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      const result = await generateSummary(mockSupabase, mockPrdId);

      expect(result).toBe(mockSummary);
      expect(mockGetStructuredResponse).toHaveBeenCalled();
    });

    it("should construct prompt with all PRD fields and Q&A pairs", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning",
        name: "My Project",
        mainProblem: "Main problem text",
        inScope: "In scope text",
        outOfScope: "Out of scope text",
        successCriteria: "Success criteria text",
      });
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: mockQuestions,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 2,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);
      mockGetStructuredResponse.mockResolvedValue({ summary: mockSummary });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generateSummary(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      const userPrompt = callArgs.userPrompt;

      // Verify prompt includes all PRD fields
      expect(userPrompt).toContain("My Project");
      expect(userPrompt).toContain("Main problem text");
      expect(userPrompt).toContain("In scope text");
      expect(userPrompt).toContain("Out of scope text");
      expect(userPrompt).toContain("Success criteria text");

      // Verify Q&A pairs are included
      expect(userPrompt).toContain("Question 1:");
      expect(userPrompt).toContain("Answer 1:");
      expect(userPrompt).toContain("Question 2:");
      expect(userPrompt).toContain("Answer 2:");
      expect(userPrompt).toContain("Answer 1");
      expect(userPrompt).toContain("Answer 2");
    });

    it("should call AI service with correct system prompt", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });
      const mockQuestionsResult: PaginatedPrdQuestionsDto = {
        questions: mockQuestions,
        pagination: {
          page: 1,
          limit: 1000,
          totalItems: 2,
          totalPages: 1,
        },
      };

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      getPrdQuestionsSpy.mockResolvedValue(mockQuestionsResult);
      mockGetStructuredResponse.mockResolvedValue({ summary: mockSummary });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generateSummary(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("expert technical writer");
      expect(callArgs.systemPrompt).toContain("Product Requirements Documents");
    });
  });

  describe("updateSummary", () => {
    const newSummary = "Updated summary content";

    it("should successfully update summary", async () => {
      const mockPrd = createMockPrdDto({ status: "planning_review" });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      const result = await updateSummary(mockSupabase, mockPrdId, newSummary);

      expect(result).toBe(newSummary);
      expect(getPrdByIdSpy).toHaveBeenCalledWith(mockSupabase, mockPrdId);
      expect(mockQueryBuilder.from).toHaveBeenCalledWith("prds");
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ summary: newSummary });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", mockPrdId);
    });

    it("should throw PrdNotFoundError when PRD doesn't exist", async () => {
      getPrdByIdSpy.mockRejectedValue(new PrdNotFoundError());

      await expect(updateSummary(mockSupabase, mockPrdId, newSummary)).rejects.toThrow(PrdNotFoundError);
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it("should throw PrdSummaryConflictError when not in planning_review status", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });

      getPrdByIdSpy.mockResolvedValue(mockPrd);

      await expect(updateSummary(mockSupabase, mockPrdId, newSummary)).rejects.toThrow(PrdSummaryConflictError);
      await expect(updateSummary(mockSupabase, mockPrdId, newSummary)).rejects.toThrow(
        "PRD must be in planning_review status to update summary"
      );
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it("should throw PrdSummaryUpdateError on database failure", async () => {
      const mockPrd = createMockPrdDto({ status: "planning_review" });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      await expect(updateSummary(mockSupabase, mockPrdId, newSummary)).rejects.toThrow(PrdSummaryUpdateError);
      await expect(updateSummary(mockSupabase, mockPrdId, newSummary)).rejects.toThrow(
        "Failed to update PRD summary: Database error"
      );
    });

    it("should call getPrdById before update", async () => {
      const mockPrd = createMockPrdDto({ status: "planning_review" });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await updateSummary(mockSupabase, mockPrdId, newSummary);

      expect(getPrdByIdSpy as unknown as MockInstance).toHaveBeenCalledBefore(
        mockQueryBuilder.update as unknown as MockInstance
      );
    });
  });

  describe("deleteSummary", () => {
    it("should successfully delete summary and revert status", async () => {
      const mockPrd = createMockPrdDto({ status: "planning_review", summary: "Existing summary" });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await deleteSummary(mockSupabase, mockPrdId);

      expect(getPrdByIdSpy).toHaveBeenCalledWith(mockSupabase, mockPrdId);
      expect(mockQueryBuilder.from).toHaveBeenCalledWith("prds");
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        summary: null,
        status: "planning",
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", mockPrdId);
    });

    it("should throw PrdNotFoundError when PRD doesn't exist", async () => {
      getPrdByIdSpy.mockRejectedValue(new PrdNotFoundError());

      await expect(deleteSummary(mockSupabase, mockPrdId)).rejects.toThrow(PrdNotFoundError);
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it("should throw PrdSummaryConflictError when not in planning_review status", async () => {
      const mockPrd = createMockPrdDto({ status: "planning" });

      getPrdByIdSpy.mockResolvedValue(mockPrd);

      await expect(deleteSummary(mockSupabase, mockPrdId)).rejects.toThrow(PrdSummaryConflictError);
      await expect(deleteSummary(mockSupabase, mockPrdId)).rejects.toThrow(
        "PRD must be in planning_review status to delete summary"
      );
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it("should throw PrdSummaryUpdateError on database failure", async () => {
      const mockPrd = createMockPrdDto({ status: "planning_review" });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      await expect(deleteSummary(mockSupabase, mockPrdId)).rejects.toThrow(PrdSummaryUpdateError);
      await expect(deleteSummary(mockSupabase, mockPrdId)).rejects.toThrow(
        "Failed to delete PRD summary: Database error"
      );
    });

    it("should set summary to null", async () => {
      const mockPrd = createMockPrdDto({ status: "planning_review", summary: "Existing summary" });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await deleteSummary(mockSupabase, mockPrdId);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: null,
        })
      );
    });

    it("should set status back to planning", async () => {
      const mockPrd = createMockPrdDto({ status: "planning_review" });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await deleteSummary(mockSupabase, mockPrdId);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "planning",
        })
      );
    });
  });

  // Note: Private helper functions (constructPlanningSessionHistory, constructSummaryPrompt, generateSummaryWithAI)
  // are tested indirectly through generateSummary tests. The prompt construction is verified in the
  // "should construct prompt with all PRD fields and Q&A pairs" test above.
});
