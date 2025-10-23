import { CreatePrdDialog } from "./CreatePrdDialog";
import type { CreatePrdCommand } from "@/types";

interface DashboardHeaderProps {
  onCreatePrd: (command: CreatePrdCommand) => Promise<void>;
  isDialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
}

export function DashboardHeader({ onCreatePrd, isDialogOpen, onDialogOpenChange }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moje dokumenty PRD</h1>
        <p className="text-muted-foreground mt-2">Zarządzaj swoimi dokumentami wymagań produktowych</p>
      </div>
      <CreatePrdDialog onSubmit={onCreatePrd} open={isDialogOpen} onOpenChange={onDialogOpenChange} />
    </div>
  );
}
