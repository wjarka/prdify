import type { FC } from "react";
import type { PrdDto } from "../../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface CompleteStepProps {
  prd: PrdDto;
  onExport: () => void;
}

export const CompleteStep: FC<CompleteStepProps> = ({ prd, onExport }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">PRD zakończony</h2>
          <p className="text-muted-foreground">
            Dokument wymagań produktowych został sfinalizowany i jest dostępny w trybie tylko do odczytu.
          </p>
        </div>
        <Badge variant="default" className="text-sm">
          Ukończony
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eksportuj dokument</CardTitle>
          <CardDescription>Pobierz dokument PRD jako plik Markdown (.md)</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onExport} className="w-full sm:w-auto">
            Pobierz jako Markdown
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dokument PRD</CardTitle>
          <CardDescription>Pełna treść sfinalizowanego dokumentu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none bg-secondary/30 p-6 rounded-lg">
            <pre className="whitespace-pre-wrap font-mono text-sm">{prd.content}</pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Informacje o dokumencie</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Utworzono:</dt>
                <dd>{new Date(prd.createdAt).toLocaleDateString("pl-PL")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ostatnia modyfikacja:</dt>
                <dd>{new Date(prd.updatedAt).toLocaleDateString("pl-PL")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Liczba rund planowania:</dt>
                <dd>{prd.currentRoundNumber}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status:</dt>
                <dd>
                  <Badge variant="outline">Zakończony</Badge>
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
