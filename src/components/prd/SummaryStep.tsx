import { useState, useCallback, useEffect, type FC } from "react";
import type { PrdDto } from "../../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { toast } from "sonner";

interface SummaryStepProps {
  prd: PrdDto;
  isSubmitting: boolean;
  onUpdateSummary: (summary: string) => void;
  onGoBackToPlanning: () => void;
  onGenerateDocument: () => void;
}

export const SummaryStep: FC<SummaryStepProps> = ({
  prd,
  isSubmitting,
  onUpdateSummary,
  onGoBackToPlanning,
  onGenerateDocument,
}) => {
  const [summary, setSummary] = useState(prd.summary || "");
  const [hasChanges, setHasChanges] = useState(false);

  // Track if summary has changed
  useEffect(() => {
    setHasChanges(summary !== (prd.summary || ""));
  }, [summary, prd.summary]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    await onUpdateSummary(summary);
    toast.success("Podsumowanie zostało zapisane");
    setHasChanges(false);
  }, [summary, hasChanges, onUpdateSummary]);

  const handleGenerateDocument = useCallback(async () => {
    // Save changes before generating document if there are any
    if (hasChanges) {
      await onUpdateSummary(summary);
    }
    await onGenerateDocument();
  }, [hasChanges, summary, onUpdateSummary, onGenerateDocument]);

  const isValid = summary.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Recenzja podsumowania</h2>
        <p className="text-muted-foreground">
          Przejrzyj wygenerowane podsumowanie sesji planistycznej. Możesz je edytować przed przejściem do generowania
          pełnego dokumentu PRD.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Podsumowanie sesji planistycznej</CardTitle>
          <CardDescription>Edytuj treść podsumowania według potrzeb</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Treść podsumowania..."
            rows={15}
            disabled={isSubmitting}
            className="resize-y font-mono text-sm"
          />

          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} variant="outline" size="sm" disabled={isSubmitting || !isValid}>
                {isSubmitting ? "Zapisywanie..." : "Zapisz zmiany"}
              </Button>
              <span className="text-sm text-muted-foreground">Masz niezapisane zmiany</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Jeśli podsumowanie wymaga więcej informacji, możesz wrócić do planowania. W przeciwnym razie przejdź do
              generowania pełnego dokumentu PRD.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={onGoBackToPlanning} variant="outline" disabled={isSubmitting} className="flex-1">
                Wróć do planowania
              </Button>
              <Button onClick={handleGenerateDocument} disabled={isSubmitting || !isValid} className="flex-1">
                {isSubmitting ? "Generowanie..." : "Zatwierdź i generuj PRD"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
