import { useState } from "react";
import { toast } from "sonner";
import { usePrds } from "@/components/hooks/usePrds";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PrdList } from "@/components/dashboard/PrdList";
import { PrdPagination } from "@/components/dashboard/PrdPagination";
import { DeleteConfirmationDialog } from "@/components/dashboard/DeleteConfirmationDialog";
import { Toaster } from "@/components/ui/sonner";
import type { CreatePrdCommand } from "@/types";

export function DashboardView() {
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    prdId: string | null;
    prdName: string | null;
  }>({
    isOpen: false,
    prdId: null,
    prdName: null,
  });

  const { prds, pagination, isLoading, error, createPrd, deletePrd } = usePrds({
    page,
    limit: 9,
    sortBy: "updatedAt",
    order: "desc",
  });

  const handleCreatePrd = async (command: CreatePrdCommand) => {
    const newPrd = await createPrd(command);
    // Navigate to the newly created PRD
    window.location.href = `/prds/${newPrd.id}`;
  };

  const handleDeleteClick = (prdId: string, prdName: string) => {
    setDeleteDialog({
      isOpen: true,
      prdId,
      prdName,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.prdId) return;

    try {
      await deletePrd(deleteDialog.prdId);
      setDeleteDialog({ isOpen: false, prdId: null, prdName: null });
      toast.success("PRD został pomyślnie usunięty");
    } catch (err) {
      toast.error("Nie udało się usunąć PRD", {
        description: err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd",
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, prdId: null, prdName: null });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreateNewClick = () => {
    setIsCreateDialogOpen(true);
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive mb-2">Wystąpił błąd</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="text-sm underline hover:no-underline">
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <DashboardHeader
            onCreatePrd={handleCreatePrd}
            isDialogOpen={isCreateDialogOpen}
            onDialogOpenChange={setIsCreateDialogOpen}
          />

          <PrdList prds={prds} isLoading={isLoading} onDelete={handleDeleteClick} onCreateNew={handleCreateNewClick} />

          {pagination && <PrdPagination pagination={pagination} onPageChange={handlePageChange} />}
        </div>

        {deleteDialog.prdId && deleteDialog.prdName && (
          <DeleteConfirmationDialog
            isOpen={deleteDialog.isOpen}
            prdName={deleteDialog.prdName}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
          />
        )}
      </div>
    </>
  );
}
