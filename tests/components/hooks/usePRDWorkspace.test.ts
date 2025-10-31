import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePRDWorkspace } from "@/components/hooks/usePRDWorkspace";
import type { PrdDto, PrdQuestionDto, PrdQuestionAnswer } from "@/types";

// Test UUIDs - using readable patterns for easier debugging
const mockPrdId = "00000000-0000-0000-0000-000000000001";
const mockUserId = "00000000-0000-0000-0000-000000000002";
const mockQuestionId1 = "00000000-0000-0000-0000-000000000010";
const mockQuestionId2 = "00000000-0000-0000-0000-000000000011";

const createMockPrd = (overrides?: Partial<PrdDto>): PrdDto => ({
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMockQuestion = (overrides?: Partial<PrdQuestionDto>): PrdQuestionDto => ({
  id: mockQuestionId1,
  prdId: mockPrdId,
  roundNumber: 1,
  question: "Test question?",
  answer: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock window.location.href for exportPrd
const mockLocationHref = vi.fn();

describe("usePRDWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationHref.mockClear();
    // Mock window.location.href
    delete (window as { location?: unknown }).location;
    (window as { location: { href: string } }).location = {
      get href() {
        return "";
      },
      set href(value: string) {
        mockLocationHref(value);
      },
    } as Location;
  });

  describe("Initial State", () => {
    it("should return initial state correctly", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockPrd(),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      expect(result.current.prd).toBeNull();
      expect(result.current.questions).toBeNull();
      expect(result.current.currentStep).toBe("loading");
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.error).toBeNull();

      // Wait for the initial fetch to complete to avoid act warnings
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Status to Step Mapping", () => {
    it("should map 'planning' status to 'planning' step", async () => {
      const mockPrd = createMockPrd({ status: "planning" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: [] }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.currentStep).toBe("planning");
      });

      expect(result.current.prd?.status).toBe("planning");
    });

    it("should map 'planning_review' status to 'summary' step", async () => {
      const mockPrd = createMockPrd({ status: "planning_review" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.currentStep).toBe("summary");
      });
    });

    it("should map 'prd_review' status to 'document' step", async () => {
      const mockPrd = createMockPrd({ status: "prd_review" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.currentStep).toBe("document");
      });
    });

    it("should map 'completed' status to 'complete' step", async () => {
      const mockPrd = createMockPrd({ status: "completed" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.currentStep).toBe("complete");
      });
    });

    it("should map unknown status to 'loading' step", async () => {
      const mockPrd = createMockPrd({ status: "unknown" as PrdDto["status"] });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.currentStep).toBe("loading");
      });
    });
  });

  describe("Initialization", () => {
    it("should fetch PRD data on mount", async () => {
      const mockPrd = createMockPrd();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: [] }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.prd).toEqual(mockPrd);
      expect(mockFetch).toHaveBeenCalledWith(`/api/prds/${mockPrdId}`);
    });

    it("should fetch questions when PRD status is 'planning'", async () => {
      const mockPrd = createMockPrd({ status: "planning" });
      const mockQuestions = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      // First call: fetch PRD
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      // Second call: fetch questions
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions }),
      });
      // Third call: check questions again (for auto-generation check)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.questions).not.toBeNull();
        expect(result.current.questions?.length).toBeGreaterThan(0);
      });

      expect(result.current.questions).toEqual(mockQuestions);
      expect(mockFetch).toHaveBeenCalledWith(`/api/prds/${mockPrdId}/questions`);
    });

    it("should auto-generate questions when none exist in planning status", async () => {
      const mockPrd = createMockPrd({ status: "planning" });
      const mockGeneratedQuestions = [createMockQuestion({ id: mockQuestionId1, question: "Generated Question 1?" })];

      // First fetch - PRD
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      // Second fetch - questions via fetchQuestions() (empty)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: [] }),
      });
      // Third fetch - check questions again (empty) - triggers generation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: [] }),
      });
      // Fourth fetch - generate questions (POST)
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });
      // Fifth fetch - fetch questions again (after generation)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockGeneratedQuestions }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(
        () => {
          expect(result.current.questions).not.toBeNull();
          expect(result.current.questions?.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      expect(mockFetch).toHaveBeenCalledWith(`/api/prds/${mockPrdId}/questions/generate`, {
        method: "POST",
      });
      expect(result.current.questions).toEqual(mockGeneratedQuestions);
    });

    it("should not fetch questions when PRD status is not 'planning'", async () => {
      const mockPrd = createMockPrd({ status: "planning_review" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.questions).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only PRD fetch
    });
  });

  describe("Error Handling", () => {
    it("should handle PRD fetch error and set error state", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(
        () => {
          expect(result.current.error).not.toBeNull();
        },
        { timeout: 3000 }
      );

      expect(result.current.currentStep).toBe("error");
      expect(result.current.error?.message).toBe("Network error");
      expect(result.current.error?.onRetry).toBeDefined();
    });

    it("should handle non-ok PRD response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(
        () => {
          expect(result.current.error).not.toBeNull();
        },
        { timeout: 3000 }
      );

      expect(result.current.currentStep).toBe("error");
      expect(result.current.error?.message).toBe("Nie udało się pobrać danych PRD");
    });

    it("should allow retry after error", async () => {
      const mockPrd = createMockPrd();
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(
        () => {
          expect(result.current.error).not.toBeNull();
        },
        { timeout: 3000 }
      );

      // Setup successful response for retry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: [] }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: [] }),
      });

      await act(async () => {
        await result.current.error?.onRetry?.();
      });

      await waitFor(
        () => {
          expect(result.current.error).toBeNull();
          expect(result.current.prd).not.toBeNull();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("submitAnswers", () => {
    it("should submit answers successfully", async () => {
      const mockPrd = createMockPrd({ status: "planning" });
      const mockQuestions = [createMockQuestion({ id: mockQuestionId1 }), createMockQuestion({ id: mockQuestionId2 })];
      const updatedQuestions = [
        createMockQuestion({ id: mockQuestionId1, answer: "Answer 1" }),
        createMockQuestion({ id: mockQuestionId2, answer: "Answer 2" }),
      ];

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const answers: PrdQuestionAnswer[] = [
        { questionId: mockQuestionId1, text: "Answer 1" },
        { questionId: mockQuestionId2, text: "Answer 2" },
      ];

      // Submit answers
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: updatedQuestions }),
      });

      await act(async () => {
        await result.current.submitAnswers(answers);
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/prds/${mockPrdId}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });
    });

    it("should handle submit answers error", async () => {
      const mockPrd = createMockPrd({ status: "planning" });
      const mockQuestions = [createMockQuestion({ id: mockQuestionId1 })];

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Submit answers - error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Validation error" }),
      });

      const answers: PrdQuestionAnswer[] = [{ questionId: mockQuestionId1, text: "Answer" }];

      await act(async () => {
        await result.current.submitAnswers(answers);
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toBe("Validation error");
        expect(result.current.isSubmitting).toBe(false);
      });
    });

    it("should set isSubmitting state during submission", async () => {
      const mockPrd = createMockPrd({ status: "planning" });
      const mockQuestions = [createMockQuestion({ id: mockQuestionId1 })];

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

      mockFetch.mockImplementationOnce(async () => {
        await submitPromise;
        return {
          ok: true,
          json: async () => ({}),
        };
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions }),
      });

      const answers: PrdQuestionAnswer[] = [{ questionId: mockQuestionId1, text: "Answer" }];

      act(() => {
        result.current.submitAnswers(answers);
      });

      expect(result.current.isSubmitting).toBe(true);

      await act(async () => {
        resolveSubmit();
        await submitPromise;
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });
    });
  });

  describe("generateNextQuestions", () => {
    it("should generate next round of questions successfully", async () => {
      const mockPrd = createMockPrd({ status: "planning", currentRoundNumber: 1 });
      const mockQuestions = [createMockQuestion({ id: mockQuestionId1 })];
      const updatedPrd = createMockPrd({ status: "planning", currentRoundNumber: 2 });
      const newQuestions = [createMockQuestion({ id: mockQuestionId2, roundNumber: 2 })];

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Generate questions
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: newQuestions }),
      });

      await act(async () => {
        await result.current.generateNextQuestions();
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/prds/${mockPrdId}/questions/generate`, {
        method: "POST",
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.prd?.currentRoundNumber).toBe(2);
      });
    });

    it("should handle generate questions error", async () => {
      const mockPrd = createMockPrd({ status: "planning" });
      const mockQuestions = [createMockQuestion({ id: mockQuestionId1 })];

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Generate questions - error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Generation failed" }),
      });

      await act(async () => {
        await result.current.generateNextQuestions();
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toBe("Generation failed");
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("generateSummary", () => {
    it("should generate summary successfully", async () => {
      const mockPrd = createMockPrd({ status: "planning" });
      const updatedPrd = createMockPrd({ status: "planning_review", summary: "Generated summary" });

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: [] }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Generate summary
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedPrd,
      });

      await act(async () => {
        await result.current.generateSummary();
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/prds/${mockPrdId}/summary`, {
        method: "POST",
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.prd?.summary).toBe("Generated summary");
        expect(result.current.currentStep).toBe("summary");
      });
    });

    it("should handle generate summary error", async () => {
      const mockPrd = createMockPrd({ status: "planning" });

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: [] }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Generate summary - error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Summary generation failed" }),
      });

      await act(async () => {
        await result.current.generateSummary();
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toBe("Summary generation failed");
      });
    });
  });

  describe("updateSummary", () => {
    it("should update summary successfully", async () => {
      const mockPrd = createMockPrd({ status: "planning_review", summary: "Old summary" });
      const updatedPrd = createMockPrd({ status: "planning_review", summary: "Updated summary" });

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update summary
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedPrd,
      });

      await act(async () => {
        await result.current.updateSummary("Updated summary");
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/prds/${mockPrdId}/summary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: "Updated summary" }),
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.prd?.summary).toBe("Updated summary");
      });
    });

    it("should handle update summary error", async () => {
      const mockPrd = createMockPrd({ status: "planning_review" });

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update summary - error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Update failed" }),
      });

      await act(async () => {
        await result.current.updateSummary("New summary");
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.isSubmitting).toBe(false);
      });
    });
  });

  describe("revertToPlanning", () => {
    it("should revert to planning successfully", async () => {
      const mockPrd = createMockPrd({ status: "planning_review" });
      const revertedPrd = createMockPrd({ status: "planning" });
      const mockQuestions = [createMockQuestion({ id: mockQuestionId1 })];

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Revert to planning
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => revertedPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions }),
      });

      await act(async () => {
        await result.current.revertToPlanning();
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/prds/${mockPrdId}/summary`, {
        method: "DELETE",
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.prd?.status).toBe("planning");
        expect(result.current.currentStep).toBe("planning");
        expect(result.current.questions).not.toBeNull();
      });
    });

    it("should handle revert to planning error", async () => {
      const mockPrd = createMockPrd({ status: "planning_review" });

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Revert - error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Revert failed" }),
      });

      await act(async () => {
        await result.current.revertToPlanning();
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("generateDocument", () => {
    it("should generate document successfully", async () => {
      const mockPrd = createMockPrd({ status: "planning_review" });
      const updatedPrd = createMockPrd({ status: "prd_review", content: "Generated document" });

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Generate document
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedPrd,
      });

      await act(async () => {
        await result.current.generateDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/prds/${mockPrdId}/document`, {
        method: "POST",
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.prd?.content).toBe("Generated document");
        expect(result.current.currentStep).toBe("document");
      });
    });

    it("should handle generate document error", async () => {
      const mockPrd = createMockPrd({ status: "planning_review" });

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Generate document - error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Document generation failed" }),
      });

      await act(async () => {
        await result.current.generateDocument();
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toBe("Document generation failed");
      });
    });
  });

  describe("updateDocument", () => {
    it("should update document successfully", async () => {
      const mockPrd = createMockPrd({ status: "prd_review", content: "Old content" });
      const updatedPrd = createMockPrd({ status: "prd_review", content: "Updated content" });

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update document
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedPrd,
      });

      await act(async () => {
        await result.current.updateDocument("Updated content");
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/prds/${mockPrdId}/document`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Updated content" }),
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.prd?.content).toBe("Updated content");
      });
    });

    it("should handle update document error", async () => {
      const mockPrd = createMockPrd({ status: "prd_review" });

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update document - error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Update failed" }),
      });

      await act(async () => {
        await result.current.updateDocument("New content");
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.isSubmitting).toBe(false);
      });
    });
  });

  describe("completePrd", () => {
    it("should complete PRD successfully", async () => {
      const mockPrd = createMockPrd({ status: "prd_review" });
      const completedPrd = createMockPrd({ status: "completed" });

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Complete PRD
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => completedPrd,
      });

      await act(async () => {
        await result.current.completePrd();
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/prds/${mockPrdId}/complete`, {
        method: "POST",
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.prd?.status).toBe("completed");
        expect(result.current.currentStep).toBe("complete");
      });
    });

    it("should handle complete PRD error", async () => {
      const mockPrd = createMockPrd({ status: "prd_review" });

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Complete PRD - error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Completion failed" }),
      });

      await act(async () => {
        await result.current.completePrd();
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toBe("Completion failed");
      });
    });
  });

  describe("exportPrd", () => {
    it("should set window.location.href to export URL", async () => {
      const mockPrd = createMockPrd();

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.exportPrd();
      });

      expect(mockLocationHref).toHaveBeenCalledWith(`/api/prds/${mockPrdId}.md`);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty questions array", async () => {
      const mockPrd = createMockPrd({ status: "planning" });

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: [] }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.questions).toEqual([]);
    });

    it("should handle null questions in response", async () => {
      const mockPrd = createMockPrd({ status: "planning" });

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: null }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.questions).toEqual([]);
    });

    it("should handle network error during fetch", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Network error");
      expect(result.current.currentStep).toBe("error");
    });

    it("should handle error without message in response", async () => {
      const mockPrd = createMockPrd({ status: "planning" });
      const mockQuestions = [createMockQuestion({ id: mockQuestionId1 })];

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrd,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: mockQuestions }),
      });

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Submit answers - error without message
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const answers: PrdQuestionAnswer[] = [{ questionId: mockQuestionId1, text: "Answer" }];

      await act(async () => {
        await result.current.submitAnswers(answers);
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toBe("Nie udało się zapisać odpowiedzi");
      });
    });

    it("should handle non-Error exceptions", async () => {
      mockFetch.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => usePRDWorkspace(mockPrdId));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Wystąpił błąd");
    });
  });
});
