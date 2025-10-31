import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePrds } from "@/components/hooks/usePrds";
import type { CreatePrdCommand, PaginatedPrdsDto, PrdDto, PrdListItemDto } from "@/types";

const mockPrds: PrdListItemDto[] = [
  {
    id: "1",
    name: "PRD 1",
    status: "planning",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "PRD 2",
    status: "completed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockPagination = { page: 1, limit: 10, totalPages: 2, totalItems: 18 };

const mockPaginatedResponse: PaginatedPrdsDto = {
  data: mockPrds,
  pagination: mockPagination,
};

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("usePrds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the initial state correctly", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPaginatedResponse,
    });

    const { result } = renderHook(() => usePrds());

    expect(result.current.prds).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    // Wait for the initial fetch to complete to avoid act warnings
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Fetching PRDs", () => {
    it("should fetch PRDs and update state on successful fetch", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPaginatedResponse,
      });

      const { result } = renderHook(() => usePrds());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.prds).toEqual(mockPrds);
        expect(result.current.pagination).toEqual(mockPagination);
        expect(result.current.error).toBeNull();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/prds?page=1&limit=10&sortBy=updatedAt&order=desc");
    });

    it("should handle fetch errors and update state accordingly", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      });

      const { result } = renderHook(() => usePrds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe("Nie udało się pobrać listy PRD");
        expect(result.current.prds).toEqual([]);
        expect(result.current.pagination).toBeNull();
      });
    });

    it("should handle network errors during fetch", async () => {
      const networkError = new Error("Network failure");
      mockFetch.mockRejectedValue(networkError);

      const { result } = renderHook(() => usePrds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(networkError.message);
        expect(result.current.prds).toEqual([]);
        expect(result.current.pagination).toBeNull();
      });
    });
  });

  describe("createPrd", () => {
    it("should create a new PRD and refetch the list", async () => {
      const newPrd: PrdDto = {
        id: "3",
        name: "New PRD",
        userId: "user-1",
        mainProblem: "Problem",
        inScope: "Scope",
        outOfScope: "Out",
        successCriteria: "Success",
        status: "planning",
        summary: null,
        content: null,
        currentRoundNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const command: CreatePrdCommand = {
        name: "New PRD",
        mainProblem: "Problem",
        inScope: "Scope",
        outOfScope: "Out",
        successCriteria: "Success",
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPaginatedResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => newPrd,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPaginatedResponse,
        });

      const { result } = renderHook(() => usePrds());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let createdPrd;
      await act(async () => {
        createdPrd = await result.current.createPrd(command);
      });

      expect(createdPrd).toEqual(newPrd);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(2, "/api/prds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
    });

    it("should throw an error if PRD creation fails", async () => {
      const command: CreatePrdCommand = {
        name: "New PRD",
        mainProblem: "Problem",
        inScope: "Scope",
        outOfScope: "Out",
        successCriteria: "Success",
      };
      const errorResponse = { error: "Validation failed" };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPaginatedResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => errorResponse,
        });

      const { result } = renderHook(() => usePrds());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await expect(result.current.createPrd(command)).rejects.toThrow(errorResponse.error);
      });
    });
  });

  describe("deletePrd", () => {
    it("should delete a PRD and refetch the list", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPaginatedResponse,
        })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [mockPrds[1]], pagination: { ...mockPagination, totalItems: 1, totalPages: 1 } }),
        });

      const { result } = renderHook(() => usePrds());
      await waitFor(() => expect(result.current.prds).toHaveLength(2));

      await act(async () => {
        await result.current.deletePrd("1");
      });

      await waitFor(() => {
        expect(result.current.prds).toHaveLength(1);
        expect(result.current.prds[0].id).toBe("2");
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(2, "/api/prds/1", { method: "DELETE" });
    });

    it("should throw an error if PRD deletion fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPaginatedResponse,
        })
        .mockResolvedValueOnce({ ok: false });

      const { result } = renderHook(() => usePrds());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await expect(result.current.deletePrd("1")).rejects.toThrow("Nie udało się usunąć PRD");
      });
    });
  });

  describe("refetch", () => {
    it("should refetch data when refetch is called", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPaginatedResponse,
      });

      const { result } = renderHook(() => usePrds());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Parameters", () => {
    it("should use the provided parameters in the fetch call", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPaginatedResponse,
      });

      const params = { page: 3, limit: 20, sortBy: "name" as const, order: "asc" as const };
      renderHook(() => usePrds(params));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/prds?page=3&limit=20&sortBy=name&order=asc");
      });
    });
  });
});
