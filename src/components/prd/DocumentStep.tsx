import { useState, useCallback, useEffect, type FC } from "react";
import type { PrdDto } from "../../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { toast } from "sonner";

interface DocumentStepProps {
  prd: PrdDto;
  isSubmitting: boolean;
  onUpdateDocument: (content: string) => void;
  onComplete: () => void;
}

export const DocumentStep: FC<DocumentStepProps> = ({ prd, isSubmitting, onUpdateDocument, onComplete }) => {
  const [content, setContent] = useState(prd.content || "");
  const [hasChanges, setHasChanges] = useState(false);

  // Track if content has changed
  useEffect(() => {
    setHasChanges(content !== (prd.content || ""));
  }, [content, prd.content]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    await onUpdateDocument(content);
    toast.success("Dokument został zapisany");
    setHasChanges(false);
  }, [content, hasChanges, onUpdateDocument]);

  const handleComplete = useCallback(async () => {
    // Save changes before completing if there are any
    if (hasChanges) {
      await onUpdateDocument(content);
    }
    await onComplete();
  }, [hasChanges, content, onUpdateDocument, onComplete]);

  const isValid = content.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Recenzja dokumentu PRD</h2>
        <p className="text-muted-foreground">
          Przejrzyj wygenerowany dokument wymagań produktowych. Możesz go edytować przed finalizacją.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dokument PRD</CardTitle>
          <CardDescription>Edytuj treść dokumentu według potrzeb</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Treść dokumentu PRD..."
            rows={20}
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
              Gdy dokument jest gotowy, kliknij &quot;Zakończ&quot;, aby sfinalizować PRD. Po zakończeniu dokument
              będzie dostępny tylko do odczytu.
            </p>
            <Button onClick={handleComplete} disabled={isSubmitting || !isValid} className="w-full">
              {isSubmitting ? "Finalizowanie..." : "Zakończ i zablokuj PRD"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
