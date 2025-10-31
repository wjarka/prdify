import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import type { PrdDto } from "@/types";
import * as prdsModule from "@/lib/services/prds";
import {
  generatePrdDocument,
  updatePrdDocument,
  PrdDocumentGenerationError,
  PrdDocumentConflictError,
  PrdDocumentUpdateError,
} from "@/lib/services/prdDocument.service";
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

const createMockPrdDto = (overrides?: Partial<PrdDto>): PrdDto => ({
  id: mockPrdId,
  userId: mockUserId,
  name: "Test PRD",
  mainProblem: "Test problem",
  inScope: "In scope",
  outOfScope: "Out of scope",
  successCriteria: "Success criteria",
  status: "planning_review",
  summary: "Test summary",
  content: null,
  currentRoundNumber: 1,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
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

describe("prdDocument.service.ts", () => {
  let mockSupabase: SupabaseClient;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  let getPrdByIdSpy: ReturnType<typeof vi.spyOn> & {
    mockResolvedValue: (value: PrdDto) => void;
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

    // Setup spy for getPrdById dependency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPrdByIdSpy = vi.spyOn(prdsModule, "getPrdById" as any) as ReturnType<typeof vi.spyOn> & {
      mockResolvedValue: (value: PrdDto) => void;
    };

    // Reset OpenRouter mock
    mockGetStructuredResponse.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Error Classes", () => {
    it("PrdDocumentGenerationError should have correct name and message", () => {
      const error = new PrdDocumentGenerationError();
      expect(error.name).toBe("PrdDocumentGenerationError");
      expect(error.message).toBe("Unable to generate PRD document");
    });

    it("PrdDocumentGenerationError should accept custom message", () => {
      const error = new PrdDocumentGenerationError("Custom message");
      expect(error.message).toBe("Custom message");
    });

    it("PrdDocumentConflictError should have correct name and message", () => {
      const error = new PrdDocumentConflictError();
      expect(error.name).toBe("PrdDocumentConflictError");
      expect(error.message).toBe("PRD status conflict for document operation");
    });

    it("PrdDocumentConflictError should accept custom message", () => {
      const error = new PrdDocumentConflictError("Custom message");
      expect(error.message).toBe("Custom message");
    });

    it("PrdDocumentUpdateError should have correct name and message", () => {
      const error = new PrdDocumentUpdateError();
      expect(error.name).toBe("PrdDocumentUpdateError");
      expect(error.message).toBe("Unable to update PRD document");
    });

    it("PrdDocumentUpdateError should accept custom message", () => {
      const error = new PrdDocumentUpdateError("Custom message");
      expect(error.message).toBe("Custom message");
    });
  });

  describe("generatePrdDocument", () => {
    const mockDocument = "# PRD Document\n\nTest content";
    const mockSummary = "Test summary content";

    it("should successfully generate document with valid PRD in planning_review status with summary", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      const result = await generatePrdDocument(mockSupabase, mockPrdId);

      expect(result).toBe(mockDocument);
      expect(getPrdByIdSpy).toHaveBeenCalledWith(mockSupabase, mockPrdId);
      expect(mockGetStructuredResponse).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith("prds");
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        content: mockDocument,
        status: "prd_review",
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", mockPrdId);
    });

    it("should return generated document content", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      const result = await generatePrdDocument(mockSupabase, mockPrdId);

      expect(result).toBe(mockDocument);
    });

    it("should call getPrdById before proceeding", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      expect(getPrdByIdSpy).toHaveBeenCalledWith(mockSupabase, mockPrdId);
      // Order is implicit: getPrdById must be called before AI service (if getPrdById fails, AI won't be called)
    });

    it("should call updatePrdDocumentContent with correct parameters", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      expect(mockQueryBuilder.from).toHaveBeenCalledWith("prds");
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        content: mockDocument,
        status: "prd_review",
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", mockPrdId);
    });

    it("should transition status from planning_review to prd_review", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "prd_review",
        })
      );
    });

    describe("Status Validation", () => {
      it("should throw PrdDocumentConflictError when PRD status is planning", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(PrdDocumentConflictError);
        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(
          "PRD must be in planning_review status to generate document"
        );
      });

      it("should throw PrdDocumentConflictError when PRD status is prd_review", async () => {
        const mockPrd = createMockPrdDto({
          status: "prd_review",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(PrdDocumentConflictError);
        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(
          "PRD must be in planning_review status to generate document"
        );
      });

      it("should throw PrdDocumentConflictError when PRD status is completed", async () => {
        const mockPrd = createMockPrdDto({
          status: "completed",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(PrdDocumentConflictError);
        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(
          "PRD must be in planning_review status to generate document"
        );
      });

      it("should include expected status in error message", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow("planning_review");
      });
    });

    describe("Summary Validation", () => {
      it("should throw PrdDocumentConflictError when PRD has no summary (null)", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: null,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(PrdDocumentConflictError);
        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(
          "Cannot generate document: PRD has no summary"
        );
      });

      it("should throw PrdDocumentConflictError when PRD has empty summary", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: "",
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(PrdDocumentConflictError);
        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(
          "Cannot generate document: PRD has no summary"
        );
      });

      it("should indicate summary requirement in error message", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: null,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow("summary");
      });
    });

    describe("PRD Existence", () => {
      it("should throw PrdNotFoundError when PRD doesn't exist", async () => {
        getPrdByIdSpy.mockRejectedValue(new PrdNotFoundError());

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(PrdNotFoundError);
      });
    });

    describe("AI Service Error Handling", () => {
      it("should wrap NetworkError in PrdDocumentGenerationError with message", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        const networkError = new NetworkError("Network failed");
        mockGetStructuredResponse.mockRejectedValue(networkError);

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(PrdDocumentGenerationError);
        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow("Network failed");
      });

      it("should wrap ApiError in PrdDocumentGenerationError with message", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        const apiError = new ApiError("API error", 500);
        mockGetStructuredResponse.mockRejectedValue(apiError);

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(PrdDocumentGenerationError);
        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow("API error");
      });

      it("should wrap ParsingError in PrdDocumentGenerationError with message", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        const parsingError = new ParsingError("Parse failed");
        mockGetStructuredResponse.mockRejectedValue(parsingError);

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(PrdDocumentGenerationError);
        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow("Parse failed");
      });

      it("should wrap ValidationError in PrdDocumentGenerationError with message", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        const validationError = new ValidationError("Validation failed");
        mockGetStructuredResponse.mockRejectedValue(validationError);

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(PrdDocumentGenerationError);
        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow("Validation failed");
      });

      it("should handle unknown errors and wrap in PrdDocumentGenerationError", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        const unknownError = new Error("Unknown error");
        mockGetStructuredResponse.mockRejectedValue(unknownError);

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(PrdDocumentGenerationError);
        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow("Unknown error");
      });

      it("should preserve original error message in wrapped error", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        const originalError = new Error("Original error message");
        mockGetStructuredResponse.mockRejectedValue(originalError);

        try {
          await generatePrdDocument(mockSupabase, mockPrdId);
        } catch (error) {
          expect(error).toBeInstanceOf(PrdDocumentGenerationError);
          expect((error as Error).message).toContain("Original error message");
        }
      });
    });

    describe("Database Update Errors", () => {
      it("should throw PrdDocumentUpdateError when database update fails", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
        mockQueryBuilder.eq.mockResolvedValue({
          data: null,
          error: { message: "Database error", code: "PGRST123" },
        });

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(PrdDocumentUpdateError);
      });

      it("should include database error details in error message", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
        mockQueryBuilder.eq.mockResolvedValue({
          data: null,
          error: { message: "Database error", code: "PGRST123" },
        });

        await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow("Database error");
      });
    });

    describe("Prompt Construction", () => {
      it("should call AI service with correct system prompt containing key sections", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
          name: "My App",
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
        mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

        await generatePrdDocument(mockSupabase, mockPrdId);

        expect(mockGetStructuredResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            systemPrompt: expect.stringContaining("Project Overview"),
          })
        );
        expect(mockGetStructuredResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            systemPrompt: expect.stringContaining("User Problem"),
          })
        );
        expect(mockGetStructuredResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            systemPrompt: expect.stringContaining("Functional Requirements"),
          })
        );
        expect(mockGetStructuredResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            systemPrompt: expect.stringContaining("User Stories"),
          })
        );
        expect(mockGetStructuredResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            systemPrompt: expect.stringContaining("Success Metrics"),
          })
        );
      });

      it("should call AI service with user prompt containing project description", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
          name: "My App",
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
        mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

        await generatePrdDocument(mockSupabase, mockPrdId);

        expect(mockGetStructuredResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            userPrompt: expect.stringContaining("<project_description>"),
          })
        );
      });

      it("should include all PRD fields in user prompt", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
          name: "My App",
          mainProblem: "Test problem",
          inScope: "In scope",
          outOfScope: "Out of scope",
          successCriteria: "Success criteria",
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
        mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

        await generatePrdDocument(mockSupabase, mockPrdId);

        const callArgs = mockGetStructuredResponse.mock.calls[0][0];
        expect(callArgs.userPrompt).toContain("My App");
        expect(callArgs.userPrompt).toContain("Test problem");
        expect(callArgs.userPrompt).toContain("In scope");
        expect(callArgs.userPrompt).toContain("Out of scope");
        expect(callArgs.userPrompt).toContain("Success criteria");
      });

      it("should include summary in project_details section", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
        mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

        await generatePrdDocument(mockSupabase, mockPrdId);

        const callArgs = mockGetStructuredResponse.mock.calls[0][0];
        expect(callArgs.userPrompt).toContain("<project_details>");
        expect(callArgs.userPrompt).toContain(mockSummary);
      });

      it("should pass JSON schema correctly", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
        mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

        await generatePrdDocument(mockSupabase, mockPrdId);

        expect(mockGetStructuredResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            jsonSchema: expect.objectContaining({
              name: "prd_document_response",
              strict: true,
              schema: expect.objectContaining({
                properties: expect.objectContaining({
                  document: expect.any(Object),
                }),
                required: ["document"],
                additionalProperties: false,
              }),
            }),
          })
        );
      });

      it("should pass temperature parameter (0.7) to AI service", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
          summary: mockSummary,
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
        mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

        await generatePrdDocument(mockSupabase, mockPrdId);

        expect(mockGetStructuredResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            params: {
              temperature: 0.7,
            },
          })
        );
      });
    });
  });

  describe("updatePrdDocument", () => {
    const mockUpdatedContent = "# Updated PRD Document\n\nUpdated content";

    it("should successfully update document content when PRD in prd_review status", async () => {
      const mockPrd = createMockPrdDto({
        status: "prd_review",
        content: "# Original content",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      const result = await updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent);

      expect(result).toBe(mockUpdatedContent);
      expect(getPrdByIdSpy).toHaveBeenCalledWith(mockSupabase, mockPrdId);
      expect(mockQueryBuilder.from).toHaveBeenCalledWith("prds");
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        content: mockUpdatedContent,
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", mockPrdId);
    });

    it("should return updated content", async () => {
      const mockPrd = createMockPrdDto({
        status: "prd_review",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      const result = await updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent);

      expect(result).toBe(mockUpdatedContent);
    });

    it("should call getPrdById before proceeding", async () => {
      const mockPrd = createMockPrdDto({
        status: "prd_review",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent);

      expect(getPrdByIdSpy).toHaveBeenCalledWith(mockSupabase, mockPrdId);
    });

    it("should call updatePrdDocumentContent with correct parameters", async () => {
      const mockPrd = createMockPrdDto({
        status: "prd_review",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent);

      expect(mockQueryBuilder.from).toHaveBeenCalledWith("prds");
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        content: mockUpdatedContent,
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", mockPrdId);
    });

    it("should NOT change status (only updates content)", async () => {
      const mockPrd = createMockPrdDto({
        status: "prd_review",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        content: mockUpdatedContent,
      });
      expect(mockQueryBuilder.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.anything(),
        })
      );
    });

    describe("Status Validation", () => {
      it("should throw PrdDocumentConflictError when PRD status is planning", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning",
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);

        await expect(updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent)).rejects.toThrow(
          PrdDocumentConflictError
        );
        await expect(updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent)).rejects.toThrow(
          "PRD must be in prd_review status to update document"
        );
      });

      it("should throw PrdDocumentConflictError when PRD status is planning_review", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning_review",
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);

        await expect(updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent)).rejects.toThrow(
          PrdDocumentConflictError
        );
        await expect(updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent)).rejects.toThrow(
          "PRD must be in prd_review status to update document"
        );
      });

      it("should throw PrdDocumentConflictError when PRD status is completed", async () => {
        const mockPrd = createMockPrdDto({
          status: "completed",
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);

        await expect(updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent)).rejects.toThrow(
          PrdDocumentConflictError
        );
        await expect(updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent)).rejects.toThrow(
          "PRD must be in prd_review status to update document"
        );
      });

      it("should include expected status in error message", async () => {
        const mockPrd = createMockPrdDto({
          status: "planning",
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);

        await expect(updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent)).rejects.toThrow("prd_review");
      });
    });

    describe("PRD Existence", () => {
      it("should throw PrdNotFoundError when PRD doesn't exist", async () => {
        getPrdByIdSpy.mockRejectedValue(new PrdNotFoundError());

        await expect(updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent)).rejects.toThrow(PrdNotFoundError);
      });
    });

    describe("Database Update Errors", () => {
      it("should throw PrdDocumentUpdateError when database update fails", async () => {
        const mockPrd = createMockPrdDto({
          status: "prd_review",
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        mockQueryBuilder.eq.mockResolvedValue({
          data: null,
          error: { message: "Database error", code: "PGRST123" },
        });

        await expect(updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent)).rejects.toThrow(
          PrdDocumentUpdateError
        );
      });

      it("should include database error details in error message", async () => {
        const mockPrd = createMockPrdDto({
          status: "prd_review",
        });

        getPrdByIdSpy.mockResolvedValue(mockPrd);
        mockQueryBuilder.eq.mockResolvedValue({
          data: null,
          error: { message: "Database error", code: "PGRST123" },
        });

        await expect(updatePrdDocument(mockSupabase, mockPrdId, mockUpdatedContent)).rejects.toThrow("Database error");
      });
    });
  });

  describe("updatePrdDocumentContent (via public functions)", () => {
    const mockDocument = "# PRD Document\n\nTest content";
    const mockSummary = "Test summary";

    it("should update content successfully through generatePrdDocument add status update", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        content: mockDocument,
        status: "prd_review",
      });
    });

    it("should update content successfully through updatePrdDocument without additional updates", async () => {
      const mockPrd = createMockPrdDto({
        status: "prd_review",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await updatePrdDocument(mockSupabase, mockPrdId, mockDocument);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        content: mockDocument,
      });
      expect(mockQueryBuilder.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.anything(),
        })
      );
    });

    it("should throw PrdDocumentUpdateError on database failure through generatePrdDocument", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: { message: "Database error", code: "PGRST123" },
      });

      await expect(generatePrdDocument(mockSupabase, mockPrdId)).rejects.toThrow(PrdDocumentUpdateError);
    });

    it("should throw PrdDocumentUpdateError on database failure through updatePrdDocument", async () => {
      const mockPrd = createMockPrdDto({
        status: "prd_review",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: { message: "Database error", code: "PGRST123" },
      });

      await expect(updatePrdDocument(mockSupabase, mockPrdId, mockDocument)).rejects.toThrow(PrdDocumentUpdateError);
    });
  });

  describe("Prompt Quality", () => {
    const mockSummary = "Test summary content";

    it("should include app name with correct formatting in project description", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
        name: "My Test App",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: "# PRD" });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.userPrompt).toContain("Application Name: My Test App");
    });

    it("should include main problem in project description", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
        mainProblem: "The main problem to solve",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: "# PRD" });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.userPrompt).toContain("Main Problem:");
      expect(callArgs.userPrompt).toContain("The main problem to solve");
    });

    it("should include in scope in project description", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
        inScope: "Feature A, Feature B",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: "# PRD" });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.userPrompt).toContain("In Scope:");
      expect(callArgs.userPrompt).toContain("Feature A, Feature B");
    });

    it("should include out of scope in project description", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
        outOfScope: "Feature C, Feature D",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: "# PRD" });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.userPrompt).toContain("Out of Scope:");
      expect(callArgs.userPrompt).toContain("Feature C, Feature D");
    });

    it("should include success criteria in project description", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
        successCriteria: "100 users, 95% satisfaction",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: "# PRD" });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.userPrompt).toContain("Success Criteria:");
      expect(callArgs.userPrompt).toContain("100 users, 95% satisfaction");
    });

    it("should wrap project description in project_description tags", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: "# PRD" });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.userPrompt).toContain("<project_description>");
      expect(callArgs.userPrompt).toContain("</project_description>");
    });

    it("should wrap summary in project_details tags", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: "# PRD" });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.userPrompt).toContain("<project_details>");
      expect(callArgs.userPrompt).toContain("</project_details>");
      expect(callArgs.userPrompt).toContain(mockSummary);
    });

    it("should include all required PRD sections in system prompt", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
        name: "My App",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: "# PRD" });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("Project Overview");
      expect(callArgs.systemPrompt).toContain("User Problem");
      expect(callArgs.systemPrompt).toContain("Functional Requirements");
      expect(callArgs.systemPrompt).toContain("Project Boundaries");
      expect(callArgs.systemPrompt).toContain("User Stories");
      expect(callArgs.systemPrompt).toContain("Success Metrics");
    });

    it("should include app name in PRD title template", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
        name: "My Test App",
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: "# PRD" });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("# Product Requirements Document (PRD) - My Test App");
    });
  });

  describe("JSON Schema", () => {
    const mockSummary = "Test summary";
    const mockDocument = "# PRD Document";

    it("should have correct schema name", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.jsonSchema.name).toBe("prd_document_response");
    });

    it("should be strict", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.jsonSchema.strict).toBe(true);
    });

    it("should require document field", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.jsonSchema.schema.required).toContain("document");
    });

    it("should have correct type for document field", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      const documentProperty = callArgs.jsonSchema.schema.properties.document as { type: string };
      expect(documentProperty.type).toBe("string");
    });

    it("should not allow additional properties", async () => {
      const mockPrd = createMockPrdDto({
        status: "planning_review",
        summary: mockSummary,
      });

      getPrdByIdSpy.mockResolvedValue(mockPrd);
      mockGetStructuredResponse.mockResolvedValue({ document: mockDocument });
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await generatePrdDocument(mockSupabase, mockPrdId);

      const callArgs = mockGetStructuredResponse.mock.calls[0][0];
      expect(callArgs.jsonSchema.schema.additionalProperties).toBe(false);
    });
  });
});
