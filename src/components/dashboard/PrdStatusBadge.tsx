import { Badge } from "@/components/ui/badge";
import type { PrdStatus } from "@/types";

interface PrdStatusViewModel {
  text: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}

const statusMap: Record<PrdStatus, PrdStatusViewModel> = {
  planning: { text: "Planowanie", variant: "default" },
  planning_review: { text: "Podsumowanie", variant: "secondary" },
  prd_review: { text: "Przegląd PRD", variant: "outline" },
  completed: { text: "Ukończony", variant: "default" },
};

interface PrdStatusBadgeProps {
  status: PrdStatus;
}

export function PrdStatusBadge({ status }: PrdStatusBadgeProps) {
  const statusInfo = statusMap[status];

  return <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>;
}
