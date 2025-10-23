import { useMemo, type FC } from "react";
import type { PrdDto, PrdQuestionDto, PrdQuestionAnswer } from "../../types";
import { QuestionHistory } from "./QuestionHistory";
import { QuestionForm } from "./QuestionForm";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

interface PlanningStepProps {
  prd: PrdDto;
  questions: PrdQuestionDto[];
  isSubmitting: boolean;
  onSubmitAnswers: (answers: PrdQuestionAnswer[]) => void;
  onContinuePlanning: () => void;
  onGenerateSummary: () => void;
}

export const PlanningStep: FC<PlanningStepProps> = ({
  prd,
  questions,
  isSubmitting,
  onSubmitAnswers,
  onContinuePlanning,
  onGenerateSummary,
}) => {
  // Separate questions into history (answered) and current round (unanswered)
  const { history, currentRound } = useMemo(() => {
    const answered: PrdQuestionDto[] = [];
    const unanswered: PrdQuestionDto[] = [];

    questions.forEach((question) => {
      if (question.answer && question.answer.trim().length > 0) {
        answered.push(question);
      } else {
        unanswered.push(question);
      }
    });

    return {
      history: answered,
      currentRound: unanswered,
    };
  }, [questions]);

  // Check if current round has been answered
  const currentRoundAnswered = currentRound.length === 0 && history.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Sesja planistyczna</h2>
          <p className="text-muted-foreground">
            Odpowiedz na pytania AI, aby doprecyzować wymagania produktowe. Po zakończeniu wygeneruj podsumowanie.
          </p>
        </div>
      </div>

      {/* Question History */}
      {history.length > 0 && <QuestionHistory questions={history} />}

      {/* Current Round Form */}
      {currentRound.length > 0 && (
        <QuestionForm
          questions={currentRound}
          roundNumber={prd.currentRoundNumber}
          isSubmitting={isSubmitting}
          onSubmit={onSubmitAnswers}
        />
      )}

      {/* Action Buttons - shown when current round is answered */}
      {currentRoundAnswered && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Wszystkie pytania w bieżącej rundzie zostały odpowiedziane. Możesz kontynuować planowanie, aby otrzymać
                więcej pytań, lub przejść do generowania podsumowania.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={onContinuePlanning} variant="outline" disabled={isSubmitting} className="flex-1">
                  Kontynuuj planowanie
                </Button>
                <Button onClick={onGenerateSummary} disabled={isSubmitting} className="flex-1">
                  Wygeneruj podsumowanie
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
