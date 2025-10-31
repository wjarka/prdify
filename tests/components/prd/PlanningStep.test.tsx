import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanningStep } from "@/components/prd/PlanningStep";
import type { PrdDto, PrdQuestionDto } from "@/types";

// Mock child components to focus on PlanningStep logic
vi.mock("@/components/prd/QuestionHistory", () => ({
  QuestionHistory: ({ questions }: { questions: PrdQuestionDto[] }) => (
    <div data-testid="question-history">History ({questions.length} questions)</div>
  ),
}));

vi.mock("@/components/prd/QuestionForm", () => ({
  QuestionForm: ({
    questions,
    roundNumber,
    isSubmitting,
  }: {
    questions: PrdQuestionDto[];
    roundNumber: number;
    isSubmitting: boolean;
    onSubmit: (answers: unknown[]) => void;
  }) => (
    <div data-testid="question-form">
      Form - Round {roundNumber} ({questions.length} questions, submitting: {String(isSubmitting)})
    </div>
  ),
}));

// Test data helpers
const mockPrdId = "00000000-0000-0000-0000-000000000001";
const mockUserId = "00000000-0000-0000-0000-000000000002";
const mockQuestionId1 = "00000000-0000-0000-0000-000000000010";
const mockQuestionId2 = "00000000-0000-0000-0000-000000000011";
const mockQuestionId3 = "00000000-0000-0000-0000-000000000012";

const createMockPrd = (overrides?: Partial<PrdDto>): PrdDto => ({
  id: mockPrdId,
  userId: mockUserId,
  name: "Test PRD",
  mainProblem: "Test problem",
  inScope: "In scope",
  outOfScope: "Out of scope",
  successCriteria: "Success criteria",
  status: "planning",
  summary: null,
  content: null,
  currentRoundNumber: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMockQuestion = (overrides?: Partial<PrdQuestionDto>): PrdQuestionDto => ({
  id: mockQuestionId1,
  prdId: mockPrdId,
  roundNumber: 1,
  question: "Test question?",
  answer: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("PlanningStep", () => {
  const mockOnSubmitAnswers = vi.fn();
  const mockOnContinuePlanning = vi.fn();
  const mockOnGenerateSummary = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Question Separation Logic", () => {
    it("should separate answered and unanswered questions correctly", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "Answer 1" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: null }),
        createMockQuestion({ id: mockQuestionId3, question: "Question 3?", answer: "Answer 3" }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // QuestionHistory should receive only answered questions (2)
      expect(screen.getByTestId("question-history")).toHaveTextContent("History (2 questions)");

      // QuestionForm should receive only unanswered questions (1)
      expect(screen.getByTestId("question-form")).toHaveTextContent("Form - Round 1 (1 questions");
    });

    it("should treat empty string answers as unanswered", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: "Answer 2" }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // Empty string should be treated as unanswered
      expect(screen.getByTestId("question-history")).toHaveTextContent("History (1 questions)");
      expect(screen.getByTestId("question-form")).toHaveTextContent("Form - Round 1 (1 questions");
    });

    it("should treat whitespace-only answers as unanswered", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "   " }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: "\t\n  " }),
        createMockQuestion({ id: mockQuestionId3, question: "Question 3?", answer: "Valid answer" }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // Whitespace-only answers should be treated as unanswered
      expect(screen.getByTestId("question-history")).toHaveTextContent("History (1 questions)");
      expect(screen.getByTestId("question-form")).toHaveTextContent("Form - Round 1 (2 questions");
    });

    it("should handle all questions answered", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "Answer 1" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: "Answer 2" }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // All answered - no form, but history exists
      expect(screen.getByTestId("question-history")).toHaveTextContent("History (2 questions)");
      expect(screen.queryByTestId("question-form")).not.toBeInTheDocument();
    });

    it("should handle all questions unanswered", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: null }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: null }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // All unanswered - no history, form exists
      expect(screen.queryByTestId("question-history")).not.toBeInTheDocument();
      expect(screen.getByTestId("question-form")).toHaveTextContent("Form - Round 1 (2 questions");
    });

    it("should handle empty questions array", () => {
      const questions: PrdQuestionDto[] = [];
      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // Empty array - no history, no form
      expect(screen.queryByTestId("question-history")).not.toBeInTheDocument();
      expect(screen.queryByTestId("question-form")).not.toBeInTheDocument();
    });
  });

  describe("Current Round Answered Detection", () => {
    it("should show action buttons when current round is answered and history exists", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "Answer 1" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: "Answer 2" }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // Action buttons should be visible
      expect(screen.getByText("Kontynuuj planowanie")).toBeInTheDocument();
      expect(screen.getByText("Wygeneruj podsumowanie")).toBeInTheDocument();
    });

    it("should not show action buttons when current round has unanswered questions", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "Answer 1" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: null }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // Action buttons should not be visible
      expect(screen.queryByText("Kontynuuj planowanie")).not.toBeInTheDocument();
      expect(screen.queryByText("Wygeneruj podsumowanie")).not.toBeInTheDocument();
    });

    it("should not show action buttons when no history exists (all questions unanswered)", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: null }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: null }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // Action buttons should not be visible (no history)
      expect(screen.queryByText("Kontynuuj planowanie")).not.toBeInTheDocument();
      expect(screen.queryByText("Wygeneruj podsumowanie")).not.toBeInTheDocument();
    });

    it("should not show action buttons when questions array is empty", () => {
      const questions: PrdQuestionDto[] = [];
      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // Action buttons should not be visible
      expect(screen.queryByText("Kontynuuj planowanie")).not.toBeInTheDocument();
      expect(screen.queryByText("Wygeneruj podsumowanie")).not.toBeInTheDocument();
    });
  });

  describe("Prop Passing", () => {
    it("should pass correct props to QuestionForm", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: null }),
      ];

      const prd = createMockPrd({ currentRoundNumber: 3 });

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={true}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // Verify QuestionForm receives correct props
      const form = screen.getByTestId("question-form");
      expect(form).toHaveTextContent("Round 3");
      expect(form).toHaveTextContent("submitting: true");
      expect(form).toHaveTextContent("1 questions");
    });

    it("should pass only unanswered questions to QuestionForm", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "Answer 1" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: null }),
        createMockQuestion({ id: mockQuestionId3, question: "Question 3?", answer: null }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // QuestionForm should receive only 2 unanswered questions
      expect(screen.getByTestId("question-form")).toHaveTextContent("Form - Round 1 (2 questions");
    });

    it("should pass only answered questions to QuestionHistory", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "Answer 1" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: "Answer 2" }),
        createMockQuestion({ id: mockQuestionId3, question: "Question 3?", answer: null }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // QuestionHistory should receive only 2 answered questions
      expect(screen.getByTestId("question-history")).toHaveTextContent("History (2 questions)");
    });
  });

  describe("Callback Handlers", () => {
    it("should call onContinuePlanning when continue button is clicked", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "Answer 1" }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      const continueButton = screen.getByText("Kontynuuj planowanie");
      fireEvent.click(continueButton);

      expect(mockOnContinuePlanning).toHaveBeenCalledTimes(1);
    });

    it("should call onGenerateSummary when generate summary button is clicked", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "Answer 1" }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      const generateButton = screen.getByText("Wygeneruj podsumowanie");
      fireEvent.click(generateButton);

      expect(mockOnGenerateSummary).toHaveBeenCalledTimes(1);
    });

    it("should disable action buttons when isSubmitting is true", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "Answer 1" }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={true}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      const continueButton = screen.getByText("Kontynuuj planowanie");
      const generateButton = screen.getByText("Wygeneruj podsumowanie");

      expect(continueButton).toBeDisabled();
      expect(generateButton).toBeDisabled();
    });
  });

  describe("Rendering", () => {
    it("should render the heading and description", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: null }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      expect(screen.getByText("Sesja planistyczna")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Odpowiedz na pytania AI, aby doprecyzować wymagania produktowe. Po zakończeniu wygeneruj podsumowanie."
        )
      ).toBeInTheDocument();
    });

    it("should render action buttons card with correct message when current round is answered", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "Answer 1" }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      expect(
        screen.getByText(
          "Wszystkie pytania w bieżącej rundzie zostały odpowiedziane. Możesz kontynuować planowanie, aby otrzymać więcej pytań, lub przejść do generowania podsumowania."
        )
      ).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle questions with very long answers", () => {
      const longAnswer = "A".repeat(1000);
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: longAnswer }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: null }),
      ];

      const prd = createMockPrd();

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // Long answer should still be treated as answered
      expect(screen.getByTestId("question-history")).toHaveTextContent("History (1 questions)");
      expect(screen.getByTestId("question-form")).toHaveTextContent("Form - Round 1 (1 questions");
    });

    it("should handle questions from different rounds", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          question: "Question 1?",
          answer: "Answer 1",
          roundNumber: 1,
        }),
        createMockQuestion({
          id: mockQuestionId2,
          question: "Question 2?",
          answer: null,
          roundNumber: 2,
        }),
      ];

      const prd = createMockPrd({ currentRoundNumber: 2 });

      render(
        <PlanningStep
          prd={prd}
          questions={questions}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // Should handle mixed rounds correctly
      expect(screen.getByTestId("question-history")).toHaveTextContent("History (1 questions)");
      expect(screen.getByTestId("question-form")).toHaveTextContent("Form - Round 2 (1 questions");
    });

    it("should handle rapid prop changes (memoization)", () => {
      const questions1: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: null }),
      ];

      const questions2: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "Answer 1" }),
      ];

      const prd = createMockPrd();

      const { rerender } = render(
        <PlanningStep
          prd={prd}
          questions={questions1}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // Initially, question is unanswered
      expect(screen.queryByTestId("question-history")).not.toBeInTheDocument();
      expect(screen.getByTestId("question-form")).toHaveTextContent("Form - Round 1 (1 questions");

      // Update props - question is now answered
      rerender(
        <PlanningStep
          prd={prd}
          questions={questions2}
          isSubmitting={false}
          onSubmitAnswers={mockOnSubmitAnswers}
          onContinuePlanning={mockOnContinuePlanning}
          onGenerateSummary={mockOnGenerateSummary}
        />
      );

      // After update, question should be in history
      expect(screen.getByTestId("question-history")).toHaveTextContent("History (1 questions)");
      expect(screen.queryByTestId("question-form")).not.toBeInTheDocument();
    });
  });
});
