import { Skeleton } from "@/components/ui/skeleton";
import { PrdCard } from "./PrdCard";
import { EmptyState } from "./EmptyState";
import type { PrdListItemDto } from "@/types";

interface PrdListProps {
  prds: PrdListItemDto[];
  isLoading: boolean;
  onDelete: (prdId: string, prdName: string) => void;
  onCreateNew: () => void;
}

export function PrdList({ prds, isLoading, onDelete, onCreateNew }: PrdListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-[120px] w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (prds.length === 0) {
    return <EmptyState onCreateNew={onCreateNew} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {prds.map((prd) => (
        <PrdCard key={prd.id} prd={prd} onDelete={onDelete} />
      ))}
    </div>
  );
}
