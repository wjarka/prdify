import type { FC } from "react";
import type { PrdQuestionDto } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface QuestionHistoryProps {
  questions: PrdQuestionDto[];
}

export const QuestionHistory: FC<QuestionHistoryProps> = ({ questions }) => {
  if (questions.length === 0) {
    return null;
  }

  // Group questions by round number
  const questionsByRound = questions.reduce(
    (acc, question) => {
      if (!acc[question.roundNumber]) {
        acc[question.roundNumber] = [];
      }
      acc[question.roundNumber].push(question);
      return acc;
    },
    {} as Record<number, PrdQuestionDto[]>
  );

  const rounds = Object.keys(questionsByRound)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-6 mb-8">
      <h3 className="text-lg font-semibold">Historia pytań i odpowiedzi</h3>
      {rounds.map((roundNumber) => (
        <Card key={roundNumber}>
          <CardHeader>
            <CardTitle className="text-base">Runda {roundNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questionsByRound[roundNumber].map((question) => (
                <div key={question.id} className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Pytanie:</div>
                  <div className="text-sm bg-secondary/50 p-3 rounded-md">{question.question}</div>
                  {question.answer && (
                    <>
                      <div className="text-sm font-medium text-muted-foreground mt-3">Odpowiedź:</div>
                      <div className="text-sm bg-primary/10 p-3 rounded-md">{question.answer}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
