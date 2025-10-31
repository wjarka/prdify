import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import type { Prd, CreatePrdCommand, UpdatePrdCommand } from "@/types";
import * as prdsModule from "@/lib/services/prds";
import {
  getCurrentRoundNumber,
  createPrd,
  updatePrd,
  getPrdById,
  getPrds,
  completePrd,
  deletePrd,
  PrdNameConflictError,
  PrdCreationError,
  PrdFetchingError,
  PrdUpdateError,
  PrdConflictError,
  RoundNumberCalculationError,
  PrdNotFoundError,
} from "@/lib/services/prds";

// Test data helpers
const mockPrdId = "00000000-0000-0000-0000-000000000001";
const mockUserId = "00000000-0000-0000-0000-000000000002";

const createMockPrdRow = (overrides?: Partial<Prd>): Prd => ({
  id: mockPrdId,
  user_id: mockUserId,
  name: "Test PRD",
  main_problem: "Test problem",
  in_scope: "In scope",
  out_of_scope: "Out of scope",
  success_criteria: "Success criteria",
  status: "planning",
  summary: null,
  content: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const createMockCreateCommand = (overrides?: Partial<CreatePrdCommand>): CreatePrdCommand => ({
  name: "Test PRD",
  mainProblem: "Test problem",
  inScope: "In scope",
  outOfScope: "Out of scope",
  successCriteria: "Success criteria",
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

describe("prds.ts", () => {
  let mockSupabase: SupabaseClient;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(() => {
    mockQueryBuilder = createMockQueryBuilder();
    mockSupabase = mockQueryBuilder as unknown as SupabaseClient;
    // Don't clear all mocks here as it clears spy implementations
    // Only reset call history for query builder methods
    Object.values(mockQueryBuilder).forEach((fn) => {
      if (typeof fn === "function" && "mockClear" in fn) {
        (fn as { mockClear: () => void }).mockClear();
      }
    });
  });

  describe("Error Classes", () => {
    it("PrdNameConflictError should have correct name and message", () => {
      const error = new PrdNameConflictError();
      expect(error.name).toBe("PrdNameConflictError");
      expect(error.message).toBe("PRD name must be unique per user");
    });

    it("PrdNameConflictError should accept custom message", () => {
      const error = new PrdNameConflictError("Custom message");
      expect(error.message).toBe("Custom message");
    });

    it("PrdCreationError should have correct name and message", () => {
      const error = new PrdCreationError();
      expect(error.name).toBe("PrdCreationError");
      expect(error.message).toBe("Unable to create PRD");
    });

    it("PrdFetchingError should have correct name and message", () => {
      const error = new PrdFetchingError();
      expect(error.name).toBe("PrdFetchingError");
      expect(error.message).toBe("Unable to fetch PRDs");
    });

    it("PrdUpdateError should have correct name and message", () => {
      const error = new PrdUpdateError();
      expect(error.name).toBe("PrdUpdateError");
      expect(error.message).toBe("Unable to update PRD");
    });

    it("PrdConflictError should have correct name and message", () => {
      const error = new PrdConflictError();
      expect(error.name).toBe("PrdConflictError");
      expect(error.message).toBe("PRD is completed and cannot be modified");
    });

    it("RoundNumberCalculationError should have correct name and message", () => {
      const error = new RoundNumberCalculationError();
      expect(error.name).toBe("RoundNumberCalculationError");
      expect(error.message).toBe("Unable to calculate current round number");
    });

    it("PrdNotFoundError should have correct name and message", () => {
      const error = new PrdNotFoundError();
      expect(error.name).toBe("PrdNotFoundError");
      expect(error.message).toBe("PRD not found");
    });
  });

  describe("getCurrentRoundNumber", () => {
    it("should return 0 when no questions exist", async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getCurrentRoundNumber(mockSupabase, mockPrdId);

      expect(result).toBe(0);
      expect(mockQueryBuilder.from).toHaveBeenCalledWith("prd_questions");
      expect(mockQueryBuilder.select).toHaveBeenCalledWith("round_number");
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("prd_id", mockPrdId);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith("round_number", { ascending: false });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
    });

    it("should return the highest round number when questions exist", async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { round_number: 3 },
        error: null,
      });

      const result = await getCurrentRoundNumber(mockSupabase, mockPrdId);

      expect(result).toBe(3);
    });

    it("should throw RoundNumberCalculationError on database error", async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: "Database error", code: "500" },
      });

      await expect(getCurrentRoundNumber(mockSupabase, mockPrdId)).rejects.toThrow(RoundNumberCalculationError);
      await expect(getCurrentRoundNumber(mockSupabase, mockPrdId)).rejects.toThrow("Database error");
    });

    it("should handle round_number 0 correctly", async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { round_number: 0 },
        error: null,
      });

      const result = await getCurrentRoundNumber(mockSupabase, mockPrdId);

      expect(result).toBe(0);
    });
  });

  describe("createPrd", () => {
    it("should create PRD with correct initial status and null fields", async () => {
      const command = createMockCreateCommand();
      const mockPrdRow = createMockPrdRow();

      // Mock getCurrentRoundNumber by spying on it
      const getCurrentRoundNumberSpy = vi.spyOn(prdsModule, "getCurrentRoundNumber");
      getCurrentRoundNumberSpy.mockImplementation(() => Promise.resolve(0));

      mockQueryBuilder.single.mockResolvedValue({
        data: mockPrdRow,
        error: null,
      });

      const result = await createPrd(mockSupabase, mockUserId, command);

      expect(mockQueryBuilder.from).toHaveBeenCalledWith("prds");
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        user_id: mockUserId,
        name: command.name,
        main_problem: command.mainProblem,
        in_scope: command.inScope,
        out_of_scope: command.outOfScope,
        success_criteria: command.successCriteria,
        status: "planning",
        summary: null,
        content: null,
      });
      expect(result.status).toBe("planning");
      expect(result.summary).toBeNull();
      expect(result.content).toBeNull();
      expect(result.currentRoundNumber).toBe(0);
      expect(result.id).toBe(mockPrdId);
      expect(result.userId).toBe(mockUserId);

      getCurrentRoundNumberSpy.mockRestore();
    });

    it("should throw PrdNameConflictError on unique constraint violation", async () => {
      const command = createMockCreateCommand();

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "Unique violation" },
      });

      await expect(createPrd(mockSupabase, mockUserId, command)).rejects.toThrow(PrdNameConflictError);
    });

    it("should throw PrdCreationError on database error", async () => {
      const command = createMockCreateCommand();

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "500", message: "Database error" },
      });

      await expect(createPrd(mockSupabase, mockUserId, command)).rejects.toThrow(PrdCreationError);
    });

    it("should throw PrdCreationError when data is null", async () => {
      const command = createMockCreateCommand();

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(createPrd(mockSupabase, mockUserId, command)).rejects.toThrow(PrdCreationError);
    });

    it("should wrap RoundNumberCalculationError in PrdCreationError", async () => {
      const command = createMockCreateCommand();
      const mockPrdRow = createMockPrdRow();

      // Mock maybeSingle to return an error, which will cause getCurrentRoundNumber to throw
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: "Round calc error", code: "500" },
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: mockPrdRow,
        error: null,
      });

      await expect(createPrd(mockSupabase, mockUserId, command)).rejects.toThrow(PrdCreationError);
      await expect(createPrd(mockSupabase, mockUserId, command)).rejects.toThrow("Round calc error");
    });
  });

  describe("updatePrd", () => {
    it("should update PRD name successfully", async () => {
      const command: UpdatePrdCommand = { name: "Updated Name" };
      const existingPrd = createMockPrdRow({ status: "planning" });
      const updatedPrd = createMockPrdRow({ name: "Updated Name", status: "planning" });

      // Mock maybeSingle to return round number 1
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { round_number: 1 },
        error: null,
      });

      // First call: fetch existing PRD
      mockQueryBuilder.single
        .mockResolvedValueOnce({
          data: existingPrd,
          error: null,
        })
        // Second call: update PRD
        .mockResolvedValueOnce({
          data: updatedPrd,
          error: null,
        });

      const result = await updatePrd(mockSupabase, mockPrdId, command);

      expect(mockQueryBuilder.from).toHaveBeenCalledWith("prds");
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ name: "Updated Name" });
      expect(result.name).toBe("Updated Name");
      expect(result.currentRoundNumber).toBe(1);
    });

    it("should throw PrdNotFoundError when PRD doesn't exist", async () => {
      const command: UpdatePrdCommand = { name: "Updated Name" };

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      await expect(updatePrd(mockSupabase, mockPrdId, command)).rejects.toThrow(PrdNotFoundError);
    });

    it("should throw PrdFetchingError on other database errors", async () => {
      const command: UpdatePrdCommand = { name: "Updated Name" };

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "500", message: "Database error" },
      });

      await expect(updatePrd(mockSupabase, mockPrdId, command)).rejects.toThrow(PrdFetchingError);
    });

    it("should throw PrdConflictError when PRD is completed", async () => {
      const command: UpdatePrdCommand = { name: "Updated Name" };
      const completedPrd = createMockPrdRow({ status: "completed" });

      mockQueryBuilder.single.mockResolvedValue({
        data: completedPrd,
        error: null,
      });

      await expect(updatePrd(mockSupabase, mockPrdId, command)).rejects.toThrow(PrdConflictError);
    });

    it("should throw PrdNameConflictError on unique constraint violation during update", async () => {
      const command: UpdatePrdCommand = { name: "Updated Name" };
      const existingPrd = createMockPrdRow({ status: "planning" });

      mockQueryBuilder.single
        .mockResolvedValueOnce({
          data: existingPrd,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "23505", message: "Unique violation" },
        });

      await expect(updatePrd(mockSupabase, mockPrdId, command)).rejects.toThrow(PrdNameConflictError);
    });

    it("should throw PrdUpdateError when update returns no data", async () => {
      const command: UpdatePrdCommand = { name: "Updated Name" };
      const existingPrd = createMockPrdRow({ status: "planning" });

      mockQueryBuilder.single
        .mockResolvedValueOnce({
          data: existingPrd,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      await expect(updatePrd(mockSupabase, mockPrdId, command)).rejects.toThrow(PrdUpdateError);
    });

    it("should wrap RoundNumberCalculationError in PrdUpdateError", async () => {
      const command: UpdatePrdCommand = { name: "Updated Name" };
      const existingPrd = createMockPrdRow({ status: "planning" });
      const updatedPrd = createMockPrdRow({ name: "Updated Name" });

      // Mock maybeSingle to return an error (called by getCurrentRoundNumber during mapPrdRowToDto)
      // This is called once when mapping the updated PRD
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Round calc error", code: "500" },
      });

      mockQueryBuilder.single
        .mockResolvedValueOnce({
          data: existingPrd,
          error: null,
        })
        .mockResolvedValueOnce({
          data: updatedPrd,
          error: null,
        });

      const promise = updatePrd(mockSupabase, mockPrdId, command);
      await expect(promise).rejects.toThrow(PrdUpdateError);
      await expect(promise).rejects.toThrow("Round calc error");
    });
  });

  describe("getPrdById", () => {
    it("should return PRD DTO when found", async () => {
      const mockPrdRow = createMockPrdRow();

      // Mock maybeSingle to return round number 2
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { round_number: 2 },
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: mockPrdRow,
        error: null,
      });

      const result = await getPrdById(mockSupabase, mockPrdId);

      expect(result.id).toBe(mockPrdId);
      expect(result.userId).toBe(mockUserId);
      expect(result.name).toBe("Test PRD");
      expect(result.status).toBe("planning");
      expect(result.currentRoundNumber).toBe(2);
      expect(mockQueryBuilder.from).toHaveBeenCalledWith("prds");
      expect(mockQueryBuilder.select).toHaveBeenCalledWith("*");
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", mockPrdId);
    });

    it("should throw PrdNotFoundError when PRD doesn't exist", async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      await expect(getPrdById(mockSupabase, mockPrdId)).rejects.toThrow(PrdNotFoundError);
    });

    it("should throw PrdFetchingError on other database errors", async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "500", message: "Database error" },
      });

      await expect(getPrdById(mockSupabase, mockPrdId)).rejects.toThrow(PrdFetchingError);
      await expect(getPrdById(mockSupabase, mockPrdId)).rejects.toThrow("Database error");
    });

    it("should wrap RoundNumberCalculationError in PrdFetchingError", async () => {
      const mockPrdRow = createMockPrdRow();

      // Mock maybeSingle to return an error
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: "Round calc error", code: "500" },
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: mockPrdRow,
        error: null,
      });

      await expect(getPrdById(mockSupabase, mockPrdId)).rejects.toThrow(PrdFetchingError);
      await expect(getPrdById(mockSupabase, mockPrdId)).rejects.toThrow("Round calc error");
    });

    it("should map all PRD fields correctly", async () => {
      const mockPrdRow = createMockPrdRow({
        summary: "Test summary",
        content: "Test content",
        status: "prd_review",
      });

      // Mock maybeSingle to return round number 5
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { round_number: 5 },
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: mockPrdRow,
        error: null,
      });

      const result = await getPrdById(mockSupabase, mockPrdId);

      expect(result.summary).toBe("Test summary");
      expect(result.content).toBe("Test content");
      expect(result.status).toBe("prd_review");
      expect(result.currentRoundNumber).toBe(5);
    });
  });

  describe("getPrds", () => {
    const mockPrdListItems = [
      {
        id: "1",
        name: "PRD 1",
        status: "planning" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "2",
        name: "PRD 2",
        status: "completed" as const,
        created_at: "2024-01-02T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      },
    ];

    it("should return paginated PRDs with correct structure", async () => {
      // Create separate query builders for count and data queries
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      // Each chain ends with a promise resolution
      countBuilder.eq.mockResolvedValue({
        count: 2,
        error: null,
      });

      dataBuilder.range.mockResolvedValue({
        data: mockPrdListItems,
        error: null,
      });

      // Mock from() to return different builders on subsequent calls
      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getPrds(mockSupabaseWithFrom, mockUserId, {
        page: 1,
        limit: 10,
        sortBy: "updatedAt",
        order: "desc",
      });

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalItems).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe("1");
      expect(result.data[0].name).toBe("PRD 1");
    });

    it("should calculate pagination correctly", async () => {
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      countBuilder.eq.mockResolvedValue({
        count: 25,
        error: null,
      });

      dataBuilder.range.mockResolvedValue({
        data: mockPrdListItems,
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getPrds(mockSupabaseWithFrom, mockUserId, {
        page: 2,
        limit: 10,
        sortBy: "name",
        order: "asc",
      });

      expect(result.pagination.totalItems).toBe(25);
      expect(result.pagination.totalPages).toBe(3); // Math.ceil(25/10)
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
    });

    it("should return empty array when no PRDs exist", async () => {
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      countBuilder.eq.mockResolvedValue({
        count: 0,
        error: null,
      });

      dataBuilder.range.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getPrds(mockSupabaseWithFrom, mockUserId, {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        order: "desc",
      });

      expect(result.data).toEqual([]);
      expect(result.pagination.totalItems).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it("should throw PrdFetchingError on count query error", async () => {
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      countBuilder.eq.mockResolvedValue({
        count: null,
        error: { message: "Count error" },
      });

      dataBuilder.range.mockResolvedValue({
        data: mockPrdListItems,
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await expect(
        getPrds(mockSupabaseWithFrom, mockUserId, {
          page: 1,
          limit: 10,
          sortBy: "updatedAt",
          order: "desc",
        })
      ).rejects.toThrow(PrdFetchingError);
    });

    it("should throw PrdFetchingError on data query error", async () => {
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      countBuilder.eq.mockResolvedValue({
        count: 2,
        error: null,
      });

      dataBuilder.range.mockResolvedValue({
        data: null,
        error: { message: "Data error" },
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      await expect(
        getPrds(mockSupabaseWithFrom, mockUserId, {
          page: 1,
          limit: 10,
          sortBy: "updatedAt",
          order: "desc",
        })
      ).rejects.toThrow(PrdFetchingError);
    });

    it("should handle null count gracefully", async () => {
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      countBuilder.eq.mockResolvedValue({
        count: null,
        error: null,
      });

      dataBuilder.range.mockResolvedValue({
        data: mockPrdListItems,
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getPrds(mockSupabaseWithFrom, mockUserId, {
        page: 1,
        limit: 10,
        sortBy: "status",
        order: "asc",
      });

      expect(result.pagination.totalItems).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it("should map sortBy values correctly", async () => {
      const sortOptions: { sortBy: "name" | "status" | "createdAt" | "updatedAt"; expected: string }[] = [
        { sortBy: "name", expected: "name" },
        { sortBy: "status", expected: "status" },
        { sortBy: "createdAt", expected: "created_at" },
        { sortBy: "updatedAt", expected: "updated_at" },
      ];

      for (const { sortBy, expected } of sortOptions) {
        const countBuilder = createMockQueryBuilder();
        const dataBuilder = createMockQueryBuilder();

        countBuilder.eq.mockResolvedValue({
          count: 2,
          error: null,
        });

        dataBuilder.range.mockResolvedValue({
          data: mockPrdListItems,
          error: null,
        });

        const mockFrom = vi.fn();
        mockFrom.mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

        const mockSupabaseWithFrom = {
          from: mockFrom,
        } as unknown as SupabaseClient;

        await getPrds(mockSupabaseWithFrom, mockUserId, {
          page: 1,
          limit: 10,
          sortBy,
          order: "asc",
        });

        // Verify order was called with correct column
        expect(dataBuilder.order).toHaveBeenCalledWith(expected, { ascending: true });
      }
    });

    it("should handle null data array gracefully", async () => {
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      countBuilder.eq.mockResolvedValue({
        count: 2,
        error: null,
      });

      dataBuilder.range.mockResolvedValue({
        data: null,
        error: null,
      });

      const mockFrom = vi.fn();
      mockFrom.mockReturnValueOnce(countBuilder).mockReturnValueOnce(dataBuilder);

      const mockSupabaseWithFrom = {
        from: mockFrom,
      } as unknown as SupabaseClient;

      const result = await getPrds(mockSupabaseWithFrom, mockUserId, {
        page: 1,
        limit: 10,
        sortBy: "updatedAt",
        order: "desc",
      });

      expect(result.data).toEqual([]);
    });
  });

  describe("completePrd", () => {
    it("should complete PRD and transition status from prd_review to completed", async () => {
      // Mock maybeSingle for getCurrentRoundNumber calls (called by getPrdById internally)
      // Each getPrdById call triggers one getCurrentRoundNumber call
      mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({
          data: { round_number: 3 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { round_number: 3 },
          error: null,
        });

      // Mock single for getPrdById calls (called twice by completePrd)
      // First call: fetch existing PRD for validation (select().eq().single())
      // Second call: fetch updated PRD after status change (select().eq().single())
      // Note: eq() returns this for chaining, then single() returns the promise
      mockQueryBuilder.single
        .mockResolvedValueOnce({
          data: createMockPrdRow({ status: "prd_review" }),
          error: null,
        })
        .mockResolvedValueOnce({
          data: createMockPrdRow({ status: "completed" }),
          error: null,
        });

      // Mock eq() to return this for chaining in select().eq().single() calls,
      // but return a promise when called after update()
      let updateCalled = false;
      const originalUpdate = mockQueryBuilder.update;
      const originalEq = mockQueryBuilder.eq;

      mockQueryBuilder.update = vi.fn().mockImplementation(() => {
        updateCalled = true;
        return mockQueryBuilder;
      });

      mockQueryBuilder.eq = vi.fn().mockImplementation(() => {
        if (updateCalled) {
          updateCalled = false; // Reset for next call
          return Promise.resolve({ error: null });
        }
        return mockQueryBuilder; // Return this for chaining
      });

      const result = await completePrd(mockSupabase, mockPrdId);

      expect(mockQueryBuilder.from).toHaveBeenCalledWith("prds");
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ status: "completed" });
      expect(result.status).toBe("completed");

      // Restore original methods
      mockQueryBuilder.update = originalUpdate;
      mockQueryBuilder.eq = originalEq;
    });

    it("should throw PrdNotFoundError when PRD doesn't exist", async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { round_number: 0 },
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      await expect(completePrd(mockSupabase, mockPrdId)).rejects.toThrow(PrdNotFoundError);
    });

    it("should throw PrdConflictError when PRD is not in prd_review status", async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { round_number: 0 },
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: createMockPrdRow({ status: "planning" }),
        error: null,
      });

      await expect(completePrd(mockSupabase, mockPrdId)).rejects.toThrow(PrdConflictError);
      await expect(completePrd(mockSupabase, mockPrdId)).rejects.toThrow(
        "PRD must be in prd_review status to be completed"
      );
    });

    it("should throw PrdUpdateError on database update failure", async () => {
      // Mock maybeSingle for getCurrentRoundNumber (only called once since update fails before second getPrdById)
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { round_number: 3 },
        error: null,
      });

      // Mock single for the first getPrdById call (for validation)
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: createMockPrdRow({ status: "prd_review" }),
        error: null,
      });

      // Mock eq() to return this for chaining in select().eq().single() call,
      // but return a promise with error when called after update()
      let updateCalled = false;
      const originalUpdate = mockQueryBuilder.update;
      const originalEq = mockQueryBuilder.eq;

      mockQueryBuilder.update = vi.fn().mockImplementation(() => {
        updateCalled = true;
        return mockQueryBuilder;
      });

      mockQueryBuilder.eq = vi.fn().mockImplementation(() => {
        if (updateCalled) {
          updateCalled = false; // Reset for next call
          return Promise.resolve({ error: { message: "Update failed" } });
        }
        return mockQueryBuilder; // Return this for chaining
      });

      const promise = completePrd(mockSupabase, mockPrdId);
      await expect(promise).rejects.toThrow(PrdUpdateError);
      await expect(promise).rejects.toThrow("Failed to complete PRD");

      // Restore original methods
      mockQueryBuilder.update = originalUpdate;
      mockQueryBuilder.eq = originalEq;
    });
  });

  describe("deletePrd", () => {
    it("should delete PRD successfully", async () => {
      mockQueryBuilder.eq.mockResolvedValue({
        error: null,
        count: 1,
      });

      await expect(deletePrd(mockSupabase, mockPrdId)).resolves.not.toThrow();

      expect(mockQueryBuilder.from).toHaveBeenCalledWith("prds");
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", mockPrdId);
    });

    it("should throw PrdNotFoundError when PRD doesn't exist", async () => {
      mockQueryBuilder.eq.mockResolvedValue({
        error: null,
        count: 0,
      });

      await expect(deletePrd(mockSupabase, mockPrdId)).rejects.toThrow(PrdNotFoundError);
    });

    it("should throw PrdFetchingError on database error", async () => {
      mockQueryBuilder.eq.mockResolvedValue({
        error: { message: "Database error" },
        count: null,
      });

      await expect(deletePrd(mockSupabase, mockPrdId)).rejects.toThrow(PrdFetchingError);
      await expect(deletePrd(mockSupabase, mockPrdId)).rejects.toThrow("Database error");
    });
  });
});
