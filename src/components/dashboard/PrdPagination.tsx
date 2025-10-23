import { Button } from "@/components/ui/button";
import type { Pagination } from "@/types";

interface PrdPaginationProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export function PrdPagination({ pagination, onPageChange }: PrdPaginationProps) {
  const { page, totalPages } = pagination;

  if (totalPages <= 1) {
    return null;
  }

  const pages: (number | string)[] = [];
  const showEllipsis = totalPages > 7;

  if (showEllipsis) {
    if (page <= 3) {
      // Show first 5 pages + ellipsis + last page
      for (let i = 1; i <= Math.min(5, totalPages); i++) {
        pages.push(i);
      }
      if (totalPages > 5) {
        pages.push("...");
        pages.push(totalPages);
      }
    } else if (page >= totalPages - 2) {
      // Show first page + ellipsis + last 5 pages
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page + ellipsis + current-1, current, current+1 + ellipsis + last page
      pages.push(1);
      pages.push("...");
      pages.push(page - 1);
      pages.push(page);
      pages.push(page + 1);
      pages.push("...");
      pages.push(totalPages);
    }
  } else {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
        Poprzednia
      </Button>

      <div className="flex gap-1">
        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 py-1">
                ...
              </span>
            );
          }

          const pageNum = p as number;
          return (
            <Button
              key={pageNum}
              variant={pageNum === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </Button>
          );
        })}
      </div>

      <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
        Następna
      </Button>
    </div>
  );
}
