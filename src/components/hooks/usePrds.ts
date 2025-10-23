import { useState, useEffect, useCallback } from "react";
import type { PaginatedPrdsDto, PrdListItemDto, CreatePrdCommand, PrdDto, Pagination } from "@/types";

interface UsePrdsParams {
  page?: number;
  limit?: number;
  sortBy?: "name" | "status" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
}

interface UsePrdsResult {
  prds: PrdListItemDto[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createPrd: (command: CreatePrdCommand) => Promise<PrdDto>;
  deletePrd: (id: string) => Promise<void>;
}

export function usePrds({
  page = 1,
  limit = 10,
  sortBy = "updatedAt",
  order = "desc",
}: UsePrdsParams = {}): UsePrdsResult {
  const [prds, setPrds] = useState<PrdListItemDto[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrds = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        order,
      });

      const response = await fetch(`/api/prds?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Nie udało się pobrać listy PRD");
      }

      const data: PaginatedPrdsDto = await response.json();
      setPrds(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd");
      setPrds([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, sortBy, order]);

  const createPrd = useCallback(
    async (command: CreatePrdCommand): Promise<PrdDto> => {
      const response = await fetch("/api/prds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Nie udało się utworzyć PRD");
      }

      const newPrd: PrdDto = await response.json();
      await fetchPrds(); // Refresh the list
      return newPrd;
    },
    [fetchPrds]
  );

  const deletePrd = useCallback(
    async (id: string): Promise<void> => {
      const response = await fetch(`/api/prds/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Nie udało się usunąć PRD");
      }

      await fetchPrds(); // Refresh the list
    },
    [fetchPrds]
  );

  useEffect(() => {
    fetchPrds();
  }, [fetchPrds]);

  return {
    prds,
    pagination,
    isLoading,
    error,
    refetch: fetchPrds,
    createPrd,
    deletePrd,
  };
}
