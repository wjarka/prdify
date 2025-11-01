import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PrdStatusBadge } from "./PrdStatusBadge";
import { PrdActionsMenu } from "./PrdActionsMenu";
import type { PrdListItemDto } from "@/types";

interface PrdCardProps {
  prd: PrdListItemDto;
  onDelete: (prdId: string, prdName: string) => void;
}

export function PrdCard({ prd, onDelete }: PrdCardProps) {
  const handleCardClick = () => {
    window.location.href = `/prds/${prd.id}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Otwórz dokument ${prd.name}`}
      data-testid={`prd-card-${prd.id}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate" data-testid={`prd-card-title-${prd.id}`}>
              {prd.name}
            </CardTitle>
            <div className="mt-2 flex items-center gap-2">
              <PrdStatusBadge status={prd.status} />
              <span className="text-xs text-muted-foreground">
                Zaktualizowano: {new Date(prd.updatedAt).toLocaleDateString("pl-PL")}
              </span>
            </div>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="none"
            data-testid={`prd-card-actions-${prd.id}`}
          >
            <PrdActionsMenu onDelete={() => onDelete(prd.id, prd.name)} />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
