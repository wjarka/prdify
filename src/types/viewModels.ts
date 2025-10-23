import type { PrdQuestionDto } from "../types";

/**
 * Reprezentuje aktualny stan widoku, mapowany ze statusu PRD, z dodatkowymi stanami UI
 */
export type PrdStep = "planning" | "summary" | "document" | "complete" | "loading" | "error";

/**
 * Struktura obiektu błędu do wyświetlania w komponencie Alert
 */
export interface ApiErrorViewModel {
  message: string;
  onRetry?: () => void; // Opcjonalny callback do ponowienia operacji
}

/**
 * View model for PRD status badge
 */
export interface PrdStatusViewModel {
  text: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}

/**
 * Model widoku dla komponentu PlanningStep, dzielący pytania na historię i bieżącą rundę
 */
export interface PlanningStepViewModel {
  history: PrdQuestionDto[]; // Wszystkie poprzednie, odpowiedziane rundy
  currentRound: PrdQuestionDto[]; // Pytania w bieżącej rundzie do wypełnienia
}
