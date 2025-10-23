import type { FC } from "react";
import type { PrdDto } from "../../types";
import type { PrdStep } from "../../types/viewModels";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface PRDHeaderProps {
  prd: PrdDto;
  currentStep: PrdStep;
}

const stepLabels: Record<PrdStep, string> = {
  planning: "Sesja planistyczna",
  summary: "Recenzja podsumowania",
  document: "Recenzja dokumentu",
  complete: "Zakończono",
  loading: "Ładowanie...",
  error: "Błąd",
};

const stepNumbers: Record<PrdStep, number | null> = {
  planning: 1,
  summary: 2,
  document: 3,
  complete: 4,
  loading: null,
  error: null,
};

export const PRDHeader: FC<PRDHeaderProps> = ({ prd, currentStep }) => {
  const stepNumber = stepNumbers[currentStep];
  const stepLabel = stepLabels[currentStep];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-2xl">{prd.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">{prd.mainProblem}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={currentStep === "complete" ? "default" : "secondary"}>{stepLabel}</Badge>
            {stepNumber && <span className="text-xs text-muted-foreground">Krok {stepNumber} z 4</span>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress bar */}
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{
              width: stepNumber ? `${(stepNumber / 4) * 100}%` : "0%",
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
