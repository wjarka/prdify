import { useState, useCallback, Fragment, type FC } from "react";
import type { PrdQuestionDto, PrdQuestionAnswer } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

interface QuestionFormProps {
  questions: PrdQuestionDto[];
  roundNumber: number;
  isSubmitting: boolean;
  onSubmit: (answers: PrdQuestionAnswer[]) => void;
}

export const QuestionForm: FC<QuestionFormProps> = ({ questions, roundNumber, isSubmitting, onSubmit }) => {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    // Initialize with existing answers if available
    const initialAnswers: Record<string, string> = {};
    questions.forEach((q) => {
      if (q.answer) {
        initialAnswers[q.id] = q.answer;
      }
    });
    return initialAnswers;
  });

  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    const answersToSubmit: PrdQuestionAnswer[] = questions.map((q) => ({
      questionId: q.id,
      text: answers[q.id] || "",
    }));
    onSubmit(answersToSubmit);
  }, [questions, answers, onSubmit]);

  // Check if all questions have been answered
  const allAnswered = questions.every((q) => {
    const answer = answers[q.id];
    return answer && answer.trim().length > 0;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Runda {roundNumber} - Odpowiedz na pytania</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-6"
        >
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-2">
              <Label htmlFor={`question-${question.id}`} className="select-text">
                Pytanie&nbsp;{index + 1}:
                <span className="font-normal ml-2 block">
                  {question.question.split("\n").map((line, i) => (
                    <Fragment key={i}>
                      {line}
                      {i < question.question.split("\n").length - 1 && <br />}
                    </Fragment>
                  ))}
                </span>
              </Label>
              <Textarea
                id={`question-${question.id}`}
                value={answers[question.id] || ""}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder="Wpisz swoją odpowiedź..."
                rows={4}
                disabled={isSubmitting}
                className="resize-y mt-5"
              />
            </div>
          ))}

          <Button type="submit" disabled={!allAnswered || isSubmitting} className="w-full">
            {isSubmitting ? "Zapisywanie..." : "Prześlij odpowiedzi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
