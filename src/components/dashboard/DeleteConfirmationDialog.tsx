import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  prdName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteConfirmationDialog({ isOpen, prdName, onConfirm, onCancel }: DeleteConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent data-testid="delete-prd-confirmation-dialog">
        <DialogHeader>
          <DialogTitle>Potwierdzenie usunięcia</DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz usunąć dokument &quot;{prdName}&quot;? Ta operacja jest nieodwracalna.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting} data-testid="delete-prd-cancel-button">
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            data-testid="delete-prd-confirm-button"
          >
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
