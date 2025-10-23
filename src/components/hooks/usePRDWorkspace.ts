import { useState, useEffect, useCallback } from "react";
import type {
  PrdDto,
  PrdQuestionDto,
  PrdQuestionAnswer,
  UpdatePrdQuestionsCommand,
  UpdatePrdSummaryCommand,
  UpdatePrdDocumentCommand,
} from "../../types";
import type { PrdStep, ApiErrorViewModel } from "../../types/viewModels";

interface UsePRDWorkspaceReturn {
  prd: PrdDto | null;
  questions: PrdQuestionDto[] | null;
  currentStep: PrdStep;
  isLoading: boolean;
  isSubmitting: boolean;
  error: ApiErrorViewModel | null;
  submitAnswers: (answers: PrdQuestionAnswer[]) => Promise<void>;
  generateNextQuestions: () => Promise<void>;
  generateSummary: () => Promise<void>;
  updateSummary: (summary: string) => Promise<void>;
  revertToPlanning: () => Promise<void>;
  generateDocument: () => Promise<void>;
  updateDocument: (content: string) => Promise<void>;
  completePrd: () => Promise<void>;
  exportPrd: () => void;
}

/**
 * Maps PRD status to UI step
 */
function mapStatusToStep(status: PrdDto["status"]): PrdStep {
  switch (status) {
    case "planning":
      return "planning";
    case "planning_review":
      return "summary";
    case "prd_review":
      return "document";
    case "completed":
      return "complete";
    default:
      return "loading";
  }
}

/**
 * Custom hook to manage PRD workspace state and interactions
 */
export function usePRDWorkspace(prdId: string): UsePRDWorkspaceReturn {
  const [prd, setPrd] = useState<PrdDto | null>(null);
  const [questions, setQuestions] = useState<PrdQuestionDto[] | null>(null);
  const [currentStep, setCurrentStep] = useState<PrdStep>("loading");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiErrorViewModel | null>(null);

  /**
   * Fetches PRD data from API
   */
  const fetchPrd = useCallback(async () => {
    try {
      const response = await fetch(`/api/prds/${prdId}`);
      if (!response.ok) {
        throw new Error("Nie udało się pobrać danych PRD");
      }
      const data: PrdDto = await response.json();
      setPrd(data);
      setCurrentStep(mapStatusToStep(data.status));
      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Wystąpił błąd");
    }
  }, [prdId]);

  /**
   * Fetches questions for planning step
   */
  const fetchQuestions = useCallback(async () => {
    try {
      const response = await fetch(`/api/prds/${prdId}/questions`);
      if (!response.ok) {
        throw new Error("Nie udało się pobrać pytań");
      }
      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Wystąpił błąd");
    }
  }, [prdId]);

  /**
   * Initial data loading
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const prdData = await fetchPrd();

        // If in planning status, fetch questions
        if (prdData.status === "planning") {
          await fetchQuestions();

          // If no questions exist, generate the first round
          const questionsResponse = await fetch(`/api/prds/${prdId}/questions`);
          const questionsData = await questionsResponse.json();

          if (!questionsData.questions || questionsData.questions.length === 0) {
            await fetch(`/api/prds/${prdId}/questions/generate`, {
              method: "POST",
            });
            await fetchQuestions();
          }
        }
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : "Nie udało się załadować PRD",
          onRetry: initialize,
        });
        setCurrentStep("error");
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [prdId, fetchPrd, fetchQuestions]);

  /**
   * Handles API errors
   */
  const handleError = useCallback((err: unknown, action: () => Promise<void>) => {
    const message = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";
    setError({
      message,
      onRetry: action,
    });
  }, []);

  /**
   * Submit answers to current round of questions
   */
  const submitAnswers = useCallback(
    async (answers: PrdQuestionAnswer[]) => {
      const action = async () => {
        try {
          setIsSubmitting(true);
          setError(null);

          const command: UpdatePrdQuestionsCommand = { answers };
          const response = await fetch(`/api/prds/${prdId}/questions`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(command),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Nie udało się zapisać odpowiedzi");
          }

          await fetchQuestions();
        } catch (err) {
          handleError(err, action);
        } finally {
          setIsSubmitting(false);
        }
      };

      await action();
    },
    [prdId, fetchQuestions, handleError]
  );

  /**
   * Generate next round of questions
   */
  const generateNextQuestions = useCallback(async () => {
    const action = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/prds/${prdId}/questions/generate`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Nie udało się wygenerować pytań");
        }

        await fetchPrd();
        await fetchQuestions();
      } catch (err) {
        handleError(err, action);
      } finally {
        setIsLoading(false);
      }
    };

    await action();
  }, [prdId, fetchPrd, fetchQuestions, handleError]);

  /**
   * Generate summary from planning session
   */
  const generateSummary = useCallback(async () => {
    const action = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/prds/${prdId}/summary`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Nie udało się wygenerować podsumowania");
        }

        await fetchPrd();
      } catch (err) {
        handleError(err, action);
      } finally {
        setIsLoading(false);
      }
    };

    await action();
  }, [prdId, fetchPrd, handleError]);

  /**
   * Update summary text
   */
  const updateSummary = useCallback(
    async (summary: string) => {
      const action = async () => {
        try {
          setIsSubmitting(true);
          setError(null);

          const command: UpdatePrdSummaryCommand = { summary };
          const response = await fetch(`/api/prds/${prdId}/summary`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(command),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Nie udało się zapisać podsumowania");
          }

          await fetchPrd();
        } catch (err) {
          handleError(err, action);
        } finally {
          setIsSubmitting(false);
        }
      };

      await action();
    },
    [prdId, fetchPrd, handleError]
  );

  /**
   * Revert from summary back to planning
   */
  const revertToPlanning = useCallback(async () => {
    const action = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/prds/${prdId}/summary`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Nie udało się wrócić do planowania");
        }

        await fetchPrd();
        await fetchQuestions();
      } catch (err) {
        handleError(err, action);
      } finally {
        setIsLoading(false);
      }
    };

    await action();
  }, [prdId, fetchPrd, fetchQuestions, handleError]);

  /**
   * Generate final PRD document from summary
   */
  const generateDocument = useCallback(async () => {
    const action = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/prds/${prdId}/document`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Nie udało się wygenerować dokumentu");
        }

        await fetchPrd();
      } catch (err) {
        handleError(err, action);
      } finally {
        setIsLoading(false);
      }
    };

    await action();
  }, [prdId, fetchPrd, handleError]);

  /**
   * Update document content
   */
  const updateDocument = useCallback(
    async (content: string) => {
      const action = async () => {
        try {
          setIsSubmitting(true);
          setError(null);

          const command: UpdatePrdDocumentCommand = { content };
          const response = await fetch(`/api/prds/${prdId}/document`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(command),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Nie udało się zapisać dokumentu");
          }

          await fetchPrd();
        } catch (err) {
          handleError(err, action);
        } finally {
          setIsSubmitting(false);
        }
      };

      await action();
    },
    [prdId, fetchPrd, handleError]
  );

  /**
   * Complete PRD and lock it
   */
  const completePrd = useCallback(async () => {
    const action = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/prds/${prdId}/complete`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Nie udało się zakończyć PRD");
        }

        await fetchPrd();
      } catch (err) {
        handleError(err, action);
      } finally {
        setIsLoading(false);
      }
    };

    await action();
  }, [prdId, fetchPrd, handleError]);

  /**
   * Export PRD as markdown file
   */
  const exportPrd = useCallback(() => {
    window.location.href = `/api/prds/${prdId}.md`;
  }, [prdId]);

  return {
    prd,
    questions,
    currentStep,
    isLoading,
    isSubmitting,
    error,
    submitAnswers,
    generateNextQuestions,
    generateSummary,
    updateSummary,
    revertToPlanning,
    generateDocument,
    updateDocument,
    completePrd,
    exportPrd,
  };
}
