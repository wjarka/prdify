/// <reference types="vitest/globals" />
import { render, screen } from "@testing-library/react";
import { PrdCard } from "@/components/dashboard/PrdCard";
import type { PrdListItemDto } from "@/types";
import { vi } from "vitest";

describe("PrdCard", () => {
  const mockPrd: Omit<PrdListItemDto, "owner"> = {
    id: "1",
    name: "Test PRD",
    status: "planning",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const onDeleteMock = vi.fn();

  it("should render the PRD name", () => {
    render(<PrdCard prd={mockPrd as PrdListItemDto} onDelete={onDeleteMock} />);
    expect(screen.getByText("Test PRD")).toBeInTheDocument();
  });

  it("should render the PRD status", () => {
    render(<PrdCard prd={mockPrd as PrdListItemDto} onDelete={onDeleteMock} />);
    expect(screen.getByText("Planowanie")).toBeInTheDocument();
  });

  it("should render the last updated date", () => {
    render(<PrdCard prd={mockPrd as PrdListItemDto} onDelete={onDeleteMock} />);
    const expectedDate = new Date(mockPrd.updatedAt).toLocaleDateString("pl-PL");
    expect(screen.getByText(`Zaktualizowano: ${expectedDate}`)).toBeInTheDocument();
  });
});
