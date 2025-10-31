import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionHistory } from "@/components/prd/QuestionHistory";
import type { PrdQuestionDto } from "@/types";

// Test UUIDs
const mockPrdId = "00000000-0000-0000-0000-000000000001";
const mockQuestionId1 = "00000000-0000-0000-0000-000000000010";
const mockQuestionId2 = "00000000-0000-0000-0000-000000000011";
const mockQuestionId3 = "00000000-0000-0000-0000-000000000012";
const mockQuestionId4 = "00000000-0000-0000-0000-000000000013";
const mockQuestionId5 = "00000000-0000-0000-0000-000000000014";

const createMockQuestion = (overrides?: Partial<PrdQuestionDto>): PrdQuestionDto => ({
  id: mockQuestionId1,
  prdId: mockPrdId,
  roundNumber: 1,
  question: "Test question?",
  answer: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("QuestionHistory", () => {
  beforeEach(() => {
    // Clear any previous renders
  });

  describe("Empty State", () => {
    it("should return null when questions array is empty", () => {
      const { container } = render(<QuestionHistory questions={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("should not render any content with empty array", () => {
      const { container } = render(<QuestionHistory questions={[]} />);
      expect(screen.queryByText(/Historia pytań/i)).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Single Question", () => {
    it("should render a single question with answer", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "What is the main problem?",
          answer: "The main problem is X",
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      expect(screen.getByText("Historia pytań i odpowiedzi")).toBeInTheDocument();
      expect(screen.getByText("Runda 1")).toBeInTheDocument();
      expect(screen.getByText("What is the main problem?")).toBeInTheDocument();
      expect(screen.getByText("The main problem is X")).toBeInTheDocument();
    });

    it("should render a single question without answer", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "What is the main problem?",
          answer: null,
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      expect(screen.getByText("What is the main problem?")).toBeInTheDocument();
      expect(screen.queryByText(/Odpowiedź:/i)).not.toBeInTheDocument();
    });

    it("should not render answer section for empty string answer", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "What is the main problem?",
          answer: "",
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      expect(screen.getByText("What is the main problem?")).toBeInTheDocument();
      expect(screen.queryByText(/Odpowiedź:/i)).not.toBeInTheDocument();
    });
  });

  describe("Grouping by Round Number", () => {
    it("should group multiple questions from the same round", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "Question 1?",
          answer: "Answer 1",
        }),
        createMockQuestion({
          id: mockQuestionId2,
          roundNumber: 1,
          question: "Question 2?",
          answer: "Answer 2",
        }),
        createMockQuestion({
          id: mockQuestionId3,
          roundNumber: 1,
          question: "Question 3?",
          answer: "Answer 3",
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      // Should have only one round header
      const roundHeaders = screen.getAllByText(/Runda 1/i);
      expect(roundHeaders).toHaveLength(1);

      // All questions should be present
      expect(screen.getByText("Question 1?")).toBeInTheDocument();
      expect(screen.getByText("Question 2?")).toBeInTheDocument();
      expect(screen.getByText("Question 3?")).toBeInTheDocument();
      expect(screen.getByText("Answer 1")).toBeInTheDocument();
      expect(screen.getByText("Answer 2")).toBeInTheDocument();
      expect(screen.getByText("Answer 3")).toBeInTheDocument();
    });

    it("should separate questions from different rounds", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "Round 1 Question 1?",
          answer: "Answer 1",
        }),
        createMockQuestion({
          id: mockQuestionId2,
          roundNumber: 2,
          question: "Round 2 Question 1?",
          answer: "Answer 2",
        }),
        createMockQuestion({
          id: mockQuestionId3,
          roundNumber: 1,
          question: "Round 1 Question 2?",
          answer: "Answer 3",
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      // Should have two round headers
      expect(screen.getByText("Runda 1")).toBeInTheDocument();
      expect(screen.getByText("Runda 2")).toBeInTheDocument();

      // All questions should be present
      expect(screen.getByText("Round 1 Question 1?")).toBeInTheDocument();
      expect(screen.getByText("Round 1 Question 2?")).toBeInTheDocument();
      expect(screen.getByText("Round 2 Question 1?")).toBeInTheDocument();
    });
  });

  describe("Round Sorting", () => {
    it("should sort rounds in ascending order when provided out of order", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 3,
          question: "Round 3 Question?",
          answer: "Answer 3",
        }),
        createMockQuestion({
          id: mockQuestionId2,
          roundNumber: 1,
          question: "Round 1 Question?",
          answer: "Answer 1",
        }),
        createMockQuestion({
          id: mockQuestionId3,
          roundNumber: 2,
          question: "Round 2 Question?",
          answer: "Answer 2",
        }),
      ];

      const { container } = render(<QuestionHistory questions={questions} />);

      // Verify all rounds are present
      expect(screen.getByText("Runda 1")).toBeInTheDocument();
      expect(screen.getByText("Runda 2")).toBeInTheDocument();
      expect(screen.getByText("Runda 3")).toBeInTheDocument();

      // Verify order by checking DOM order
      const roundHeaders = container.querySelectorAll('[data-slot="card-title"]');
      expect(roundHeaders[0]).toHaveTextContent("Runda 1");
      expect(roundHeaders[1]).toHaveTextContent("Runda 2");
      expect(roundHeaders[2]).toHaveTextContent("Runda 3");
    });

    it("should handle large round numbers correctly", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 10,
          question: "Round 10 Question?",
          answer: "Answer 10",
        }),
        createMockQuestion({
          id: mockQuestionId2,
          roundNumber: 2,
          question: "Round 2 Question?",
          answer: "Answer 2",
        }),
        createMockQuestion({
          id: mockQuestionId3,
          roundNumber: 5,
          question: "Round 5 Question?",
          answer: "Answer 5",
        }),
      ];

      const { container } = render(<QuestionHistory questions={questions} />);

      const roundHeaders = container.querySelectorAll('[data-slot="card-title"]');
      expect(roundHeaders[0]).toHaveTextContent("Runda 2");
      expect(roundHeaders[1]).toHaveTextContent("Runda 5");
      expect(roundHeaders[2]).toHaveTextContent("Runda 10");
    });

    it("should handle round number 0", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 0,
          question: "Round 0 Question?",
          answer: "Answer 0",
        }),
        createMockQuestion({
          id: mockQuestionId2,
          roundNumber: 1,
          question: "Round 1 Question?",
          answer: "Answer 1",
        }),
      ];

      const { container } = render(<QuestionHistory questions={questions} />);

      const roundHeaders = container.querySelectorAll('[data-slot="card-title"]');
      expect(roundHeaders[0]).toHaveTextContent("Runda 0");
      expect(roundHeaders[1]).toHaveTextContent("Runda 1");
    });
  });

  describe("Question and Answer Display", () => {
    it("should display question text correctly", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "What is the primary goal of this feature?",
          answer: "To improve user experience",
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      expect(screen.getByText("What is the primary goal of this feature?")).toBeInTheDocument();
    });

    it("should display answer text correctly when present", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "What is the main problem?",
          answer: "Users cannot complete the checkout process efficiently",
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      expect(screen.getByText("Users cannot complete the checkout process efficiently")).toBeInTheDocument();
      expect(screen.getByText(/Odpowiedź:/i)).toBeInTheDocument();
    });

    it("should not display answer section when answer is null", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "What is the main problem?",
          answer: null,
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      expect(screen.getByText("What is the main problem?")).toBeInTheDocument();
      expect(screen.queryByText(/Odpowiedź:/i)).not.toBeInTheDocument();
    });

    it("should handle long answer text", () => {
      const longAnswer = "A".repeat(500);
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "What is the main problem?",
          answer: longAnswer,
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      expect(screen.getByText(longAnswer)).toBeInTheDocument();
    });

    it("should handle special characters in question and answer", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "What about <script>alert('XSS')</script>?",
          answer: "Answer with <>&\"' special chars",
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      expect(screen.getByText("What about <script>alert('XSS')</script>?")).toBeInTheDocument();
      expect(screen.getByText("Answer with <>&\"' special chars")).toBeInTheDocument();
    });

    it("should display both question label and answer label correctly", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "What is the main problem?",
          answer: "The main problem is X",
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      expect(screen.getByText(/Pytanie:/i)).toBeInTheDocument();
      expect(screen.getByText(/Odpowiedź:/i)).toBeInTheDocument();
    });
  });

  describe("Multiple Rounds with Mixed States", () => {
    it("should handle multiple rounds with mixed answered and unanswered questions", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "Round 1 Question 1?",
          answer: "Answer 1",
        }),
        createMockQuestion({
          id: mockQuestionId2,
          roundNumber: 1,
          question: "Round 1 Question 2?",
          answer: null,
        }),
        createMockQuestion({
          id: mockQuestionId3,
          roundNumber: 2,
          question: "Round 2 Question 1?",
          answer: "Answer 2",
        }),
        createMockQuestion({
          id: mockQuestionId4,
          roundNumber: 2,
          question: "Round 2 Question 2?",
          answer: "",
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      // Verify rounds are present
      expect(screen.getByText("Runda 1")).toBeInTheDocument();
      expect(screen.getByText("Runda 2")).toBeInTheDocument();

      // Verify questions
      expect(screen.getByText("Round 1 Question 1?")).toBeInTheDocument();
      expect(screen.getByText("Round 1 Question 2?")).toBeInTheDocument();
      expect(screen.getByText("Round 2 Question 1?")).toBeInTheDocument();
      expect(screen.getByText("Round 2 Question 2?")).toBeInTheDocument();

      // Verify answers (only for questions with non-empty answers)
      expect(screen.getByText("Answer 1")).toBeInTheDocument();
      expect(screen.getByText("Answer 2")).toBeInTheDocument();
      // Round 1 Question 2 and Round 2 Question 2 should not have answer sections
      const answerLabels = screen.getAllByText(/Odpowiedź:/i);
      expect(answerLabels).toHaveLength(2);
    });

    it("should handle complex scenario with 5 rounds and multiple questions each", () => {
      const questions: PrdQuestionDto[] = [
        // Round 3
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 3,
          question: "R3 Q1?",
          answer: "A3-1",
        }),
        createMockQuestion({
          id: mockQuestionId2,
          roundNumber: 3,
          question: "R3 Q2?",
          answer: "A3-2",
        }),
        // Round 1
        createMockQuestion({
          id: mockQuestionId3,
          roundNumber: 1,
          question: "R1 Q1?",
          answer: "A1-1",
        }),
        // Round 5
        createMockQuestion({
          id: mockQuestionId4,
          roundNumber: 5,
          question: "R5 Q1?",
          answer: "A5-1",
        }),
        // Round 1 (second question)
        createMockQuestion({
          id: mockQuestionId5,
          roundNumber: 1,
          question: "R1 Q2?",
          answer: "A1-2",
        }),
      ];

      const { container } = render(<QuestionHistory questions={questions} />);

      // Verify rounds are sorted correctly
      const roundHeaders = container.querySelectorAll('[data-slot="card-title"]');
      expect(roundHeaders).toHaveLength(3); // Rounds 1, 3, 5
      expect(roundHeaders[0]).toHaveTextContent("Runda 1");
      expect(roundHeaders[1]).toHaveTextContent("Runda 3");
      expect(roundHeaders[2]).toHaveTextContent("Runda 5");

      // Verify all questions are present
      expect(screen.getByText("R1 Q1?")).toBeInTheDocument();
      expect(screen.getByText("R1 Q2?")).toBeInTheDocument();
      expect(screen.getByText("R3 Q1?")).toBeInTheDocument();
      expect(screen.getByText("R3 Q2?")).toBeInTheDocument();
      expect(screen.getByText("R5 Q1?")).toBeInTheDocument();
    });
  });

  describe("Component Structure", () => {
    it("should render the main heading", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "Test question?",
          answer: "Test answer",
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      const heading = screen.getByText("Historia pytań i odpowiedzi");
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H3");
    });

    it("should render cards for each round", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "Question 1?",
          answer: "Answer 1",
        }),
        createMockQuestion({
          id: mockQuestionId2,
          roundNumber: 2,
          question: "Question 2?",
          answer: "Answer 2",
        }),
      ];

      const { container } = render(<QuestionHistory questions={questions} />);

      // Should have 2 cards (one per round)
      const cards = container.querySelectorAll('[data-slot="card"]');
      expect(cards).toHaveLength(2);
    });

    it("should have correct structure with CardHeader and CardContent", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "Question 1?",
          answer: "Answer 1",
        }),
      ];

      const { container } = render(<QuestionHistory questions={questions} />);

      // Verify card structure
      const card = container.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();

      const cardHeader = container.querySelector('[data-slot="card-header"]');
      expect(cardHeader).toBeInTheDocument();

      const cardContent = container.querySelector('[data-slot="card-content"]');
      expect(cardContent).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle questions with identical IDs in different rounds", () => {
      // Note: This is an edge case that shouldn't happen in practice
      // but the component should handle it gracefully
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "Round 1 Question?",
          answer: "Answer 1",
        }),
        createMockQuestion({
          id: mockQuestionId1, // Same ID (edge case)
          roundNumber: 2,
          question: "Round 2 Question?",
          answer: "Answer 2",
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      // Both should render (React key handles this)
      expect(screen.getByText("Round 1 Question?")).toBeInTheDocument();
      expect(screen.getByText("Round 2 Question?")).toBeInTheDocument();
    });

    it("should handle questions with very long text", () => {
      const longQuestion = "Q".repeat(1000);
      const longAnswer = "A".repeat(1000);
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: longQuestion,
          answer: longAnswer,
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      expect(screen.getByText(longQuestion)).toBeInTheDocument();
      expect(screen.getByText(longAnswer)).toBeInTheDocument();
    });

    it("should handle whitespace-only answers", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({
          id: mockQuestionId1,
          roundNumber: 1,
          question: "Question?",
          answer: "   \n\t  ", // Whitespace only
        }),
      ];

      render(<QuestionHistory questions={questions} />);

      // Whitespace-only strings are truthy, so answer section should render
      expect(screen.getByText(/Odpowiedź:/i)).toBeInTheDocument();
    });
  });
});
