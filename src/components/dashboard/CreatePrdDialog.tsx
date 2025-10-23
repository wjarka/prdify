import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreatePrdForm } from "./CreatePrdForm";
import type { CreatePrdCommand } from "@/types";

interface CreatePrdDialogProps {
  onSubmit: (command: CreatePrdCommand) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreatePrdDialog({ onSubmit, open, onOpenChange }: CreatePrdDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (command: CreatePrdCommand) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(command);
      onOpenChange?.(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange?.(newOpen);
    // Clear error when dialog is closed
    if (!newOpen) {
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg">Utwórz nowy PRD</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Utwórz nowy dokument PRD</DialogTitle>
          <DialogDescription>
            Wypełnij poniższe informacje, aby rozpocząć proces tworzenia dokumentu wymagań produktowych.
          </DialogDescription>
        </DialogHeader>
        {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <CreatePrdForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </DialogContent>
    </Dialog>
  );
}
