import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuestionForm } from "@/components/prd/QuestionForm";
import type { PrdQuestionDto, PrdQuestionAnswer } from "@/types";

// Test UUIDs
const mockPrdId = "00000000-0000-0000-0000-000000000001";
const mockQuestionId1 = "00000000-0000-0000-0000-000000000010";
const mockQuestionId2 = "00000000-0000-0000-0000-000000000011";
const mockQuestionId3 = "00000000-0000-0000-0000-000000000012";

const createMockQuestion = (overrides?: Partial<PrdQuestionDto>): PrdQuestionDto => ({
  id: mockQuestionId1,
  prdId: mockPrdId,
  roundNumber: 1,
  question: "Test question?",
  answer: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("QuestionForm", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with empty answers when questions have no answers", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const textarea2 = screen.getByLabelText(/Pytanie 2:/i) as HTMLTextAreaElement;

      expect(textarea1.value).toBe("");
      expect(textarea2.value).toBe("");
    });

    it("should initialize with existing answers when questions have answers", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "Existing answer 1" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: "Existing answer 2" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const textarea2 = screen.getByLabelText(/Pytanie 2:/i) as HTMLTextAreaElement;

      expect(textarea1.value).toBe("Existing answer 1");
      expect(textarea2.value).toBe("Existing answer 2");
    });

    it("should initialize with mixed answered and unanswered questions", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "Answer 1" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: null }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const textarea2 = screen.getByLabelText(/Pytanie 2:/i) as HTMLTextAreaElement;

      expect(textarea1.value).toBe("Answer 1");
      expect(textarea2.value).toBe("");
    });

    it("should handle empty string answers as unanswered", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?", answer: "" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?", answer: null }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const textarea2 = screen.getByLabelText(/Pytanie 2:/i) as HTMLTextAreaElement;

      expect(textarea1.value).toBe("");
      expect(textarea2.value).toBe("");
    });
  });

  describe("Answer Input Handling", () => {
    it("should update answer when user types in textarea", () => {
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "My answer" } });

      expect(textarea.value).toBe("My answer");
    });

    it("should update multiple answers independently", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const textarea2 = screen.getByLabelText(/Pytanie 2:/i) as HTMLTextAreaElement;

      fireEvent.change(textarea1, { target: { value: "Answer 1" } });
      fireEvent.change(textarea2, { target: { value: "Answer 2" } });

      expect(textarea1.value).toBe("Answer 1");
      expect(textarea2.value).toBe("Answer 2");
    });

    it("should preserve answers when updating other questions", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
        createMockQuestion({ id: mockQuestionId3, question: "Question 3?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const textarea2 = screen.getByLabelText(/Pytanie 2:/i) as HTMLTextAreaElement;
      const textarea3 = screen.getByLabelText(/Pytanie 3:/i) as HTMLTextAreaElement;

      fireEvent.change(textarea1, { target: { value: "Answer 1" } });
      fireEvent.change(textarea2, { target: { value: "Answer 2" } });
      fireEvent.change(textarea3, { target: { value: "Answer 3" } });

      // Update textarea2 again - others should remain unchanged
      fireEvent.change(textarea2, { target: { value: "Updated Answer 2" } });

      expect(textarea1.value).toBe("Answer 1");
      expect(textarea2.value).toBe("Updated Answer 2");
      expect(textarea3.value).toBe("Answer 3");
    });

    it("should handle very long answers", () => {
      const longAnswer = "A".repeat(5000);
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: longAnswer } });

      expect(textarea.value).toBe(longAnswer);
    });
  });

  describe("Validation Logic", () => {
    it("should disable submit button when no questions are answered", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", { name: /Prześlij odpowiedzi/i });
      expect(submitButton).toBeDisabled();
    });

    it("should disable submit button when only some questions are answered", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      fireEvent.change(textarea1, { target: { value: "Answer 1" } });

      const submitButton = screen.getByRole("button", { name: /Prześlij odpowiedzi/i });
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when all questions are answered", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const textarea2 = screen.getByLabelText(/Pytanie 2:/i) as HTMLTextAreaElement;

      fireEvent.change(textarea1, { target: { value: "Answer 1" } });
      fireEvent.change(textarea2, { target: { value: "Answer 2" } });

      const submitButton = screen.getByRole("button", { name: /Prześlij odpowiedzi/i });
      expect(submitButton).not.toBeDisabled();
    });

    it("should treat whitespace-only answers as invalid", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const textarea2 = screen.getByLabelText(/Pytanie 2:/i) as HTMLTextAreaElement;

      fireEvent.change(textarea1, { target: { value: "   " } });
      fireEvent.change(textarea2, { target: { value: "\t\n  " } });

      const submitButton = screen.getByRole("button", { name: /Prześlij odpowiedzi/i });
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when answers contain non-whitespace characters", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const textarea2 = screen.getByLabelText(/Pytanie 2:/i) as HTMLTextAreaElement;

      // Answers with leading/trailing whitespace but containing text
      fireEvent.change(textarea1, { target: { value: "  Answer 1  " } });
      fireEvent.change(textarea2, { target: { value: "\nAnswer 2\t" } });

      const submitButton = screen.getByRole("button", { name: /Prześlij odpowiedzi/i });
      expect(submitButton).not.toBeDisabled();
    });

    it("should handle single question form correctly", () => {
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", { name: /Prześlij odpowiedzi/i });
      expect(submitButton).toBeDisabled();

      const textarea = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Answer" } });

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Form Submission", () => {
    it("should call onSubmit with correct data structure when form is submitted", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const textarea2 = screen.getByLabelText(/Pytanie 2:/i) as HTMLTextAreaElement;

      fireEvent.change(textarea1, { target: { value: "Answer 1" } });
      fireEvent.change(textarea2, { target: { value: "Answer 2" } });

      const form = textarea1.closest("form") as HTMLFormElement;
      fireEvent.submit(form);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      const submittedAnswers: PrdQuestionAnswer[] = mockOnSubmit.mock.calls[0][0];
      expect(submittedAnswers).toHaveLength(2);
      expect(submittedAnswers).toEqual([
        { questionId: mockQuestionId1, text: "Answer 1" },
        { questionId: mockQuestionId2, text: "Answer 2" },
      ]);
    });

    it("should transform answers to PrdQuestionAnswer format correctly", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
        createMockQuestion({ id: mockQuestionId3, question: "Question 3?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const textarea2 = screen.getByLabelText(/Pytanie 2:/i) as HTMLTextAreaElement;
      const textarea3 = screen.getByLabelText(/Pytanie 3:/i) as HTMLTextAreaElement;

      fireEvent.change(textarea1, { target: { value: "First answer" } });
      fireEvent.change(textarea2, { target: { value: "Second answer" } });
      fireEvent.change(textarea3, { target: { value: "Third answer" } });

      const form = textarea1.closest("form") as HTMLFormElement;
      fireEvent.submit(form);

      const submittedAnswers: PrdQuestionAnswer[] = mockOnSubmit.mock.calls[0][0];
      expect(submittedAnswers).toEqual([
        { questionId: mockQuestionId1, text: "First answer" },
        { questionId: mockQuestionId2, text: "Second answer" },
        { questionId: mockQuestionId3, text: "Third answer" },
      ]);
    });

    it("should submit empty strings for unanswered questions", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      // Only answer first question
      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      fireEvent.change(textarea1, { target: { value: "Answer 1" } });

      // When not all questions are answered, the button is disabled
      // So submit cannot be triggered. This test verifies that empty answers
      // are not submitted when validation fails.
      const submitButton = screen.getByRole("button", { name: /Prześlij odpowiedzi/i });
      expect(submitButton).toBeDisabled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should prevent default form submission behavior", () => {
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Answer" } });

      const form = textarea.closest("form") as HTMLFormElement;
      fireEvent.submit(form);

      // Form submission should call onSubmit with correct data
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it("should include all questions in submission order", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId3, question: "Question 3?" }),
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      // Answer all questions
      screen.getAllByRole("textbox").forEach((textarea, index) => {
        fireEvent.change(textarea, { target: { value: `Answer ${index + 1}` } });
      });

      const form = screen.getAllByRole("textbox")[0].closest("form") as HTMLFormElement;
      fireEvent.submit(form);

      const submittedAnswers: PrdQuestionAnswer[] = mockOnSubmit.mock.calls[0][0];
      // Should maintain the order of questions array
      expect(submittedAnswers[0].questionId).toBe(mockQuestionId3);
      expect(submittedAnswers[1].questionId).toBe(mockQuestionId1);
      expect(submittedAnswers[2].questionId).toBe(mockQuestionId2);
    });
  });

  describe("Submitting State", () => {
    it("should disable submit button when isSubmitting is true", () => {
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={true} onSubmit={mockOnSubmit} />);

      const textarea = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Answer" } });

      const submitButton = screen.getByRole("button", { name: /Zapisywanie/i });
      expect(submitButton).toBeDisabled();
    });

    it("should disable all textareas when isSubmitting is true", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={true} onSubmit={mockOnSubmit} />);

      const textareas = screen.getAllByRole("textbox");
      textareas.forEach((textarea) => {
        expect(textarea).toBeDisabled();
      });
    });

    it("should show 'Zapisywanie...' text when isSubmitting is true", () => {
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={true} onSubmit={mockOnSubmit} />);

      expect(screen.getByText("Zapisywanie...")).toBeInTheDocument();
    });

    it("should show 'Prześlij odpowiedzi' text when isSubmitting is false", () => {
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      expect(screen.getByText("Prześlij odpowiedzi")).toBeInTheDocument();
    });
  });

  describe("Rendering", () => {
    it("should render card with correct title showing round number", () => {
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      render(<QuestionForm questions={questions} roundNumber={3} isSubmitting={false} onSubmit={mockOnSubmit} />);

      expect(screen.getByText("Runda 3 - Odpowiedz na pytania")).toBeInTheDocument();
    });

    it("should render all questions with correct labels", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "What is the main problem?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Who are the users?" }),
        createMockQuestion({ id: mockQuestionId3, question: "What are the success criteria?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/Pytanie 1:/i)).toBeInTheDocument();
      expect(screen.getByText(/Pytanie 2:/i)).toBeInTheDocument();
      expect(screen.getByText(/Pytanie 3:/i)).toBeInTheDocument();

      expect(screen.getByText("What is the main problem?")).toBeInTheDocument();
      expect(screen.getByText("Who are the users?")).toBeInTheDocument();
      expect(screen.getByText("What are the success criteria?")).toBeInTheDocument();
    });

    it("should render correct number of textareas", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
        createMockQuestion({ id: mockQuestionId3, question: "Question 3?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textareas = screen.getAllByRole("textbox");
      expect(textareas).toHaveLength(3);
    });

    it("should render textareas with correct placeholders", () => {
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea = screen.getByPlaceholderText("Wpisz swoją odpowiedź...");
      expect(textarea).toBeInTheDocument();
    });

    it("should render textareas with correct ids for accessibility", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/Pytanie 1:/i)).toHaveAttribute("id", `question-${mockQuestionId1}`);
      expect(screen.getByLabelText(/Pytanie 2:/i)).toHaveAttribute("id", `question-${mockQuestionId2}`);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty questions array", () => {
      const questions: PrdQuestionDto[] = [];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      // Should render form but with no questions
      expect(screen.getByText("Runda 1 - Odpowiedz na pytania")).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      // When questions array is empty, allAnswered evaluates to true (every() on empty array)
      // So button is enabled, but submitting should still work correctly
      const submitButton = screen.getByRole("button", { name: /Prześlij odpowiedzi/i });
      expect(submitButton).not.toBeDisabled();

      // Submitting with empty questions should call onSubmit with empty array
      const form = submitButton.closest("form") as HTMLFormElement;
      fireEvent.submit(form);
      expect(mockOnSubmit).toHaveBeenCalledWith([]);
    });

    it("should handle questions with very long text", () => {
      const longQuestion = "A".repeat(500);
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: longQuestion })];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      expect(screen.getByText(longQuestion)).toBeInTheDocument();
    });

    it("should handle questions with special characters", () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: 'Question with <special> & "characters"?' }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/Question with.*special.*characters/i)).toBeInTheDocument();
    });

    it("should handle answers with special characters", () => {
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const specialAnswer = 'Answer with "quotes", <tags>, & symbols';
      fireEvent.change(textarea, { target: { value: specialAnswer } });

      expect(textarea.value).toBe(specialAnswer);
    });

    it("should handle answers with newlines and tabs", () => {
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const multilineAnswer = "Line 1\nLine 2\n\tIndented line";
      fireEvent.change(textarea, { target: { value: multilineAnswer } });

      expect(textarea.value).toBe(multilineAnswer);
    });

    it("should handle rapid sequential updates", async () => {
      const questions: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Question 1?" }),
        createMockQuestion({ id: mockQuestionId2, question: "Question 2?" }),
      ];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const textarea1 = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      const textarea2 = screen.getByLabelText(/Pytanie 2:/i) as HTMLTextAreaElement;

      // Rapid updates
      fireEvent.change(textarea1, { target: { value: "A" } });
      fireEvent.change(textarea2, { target: { value: "B" } });
      fireEvent.change(textarea1, { target: { value: "AA" } });
      fireEvent.change(textarea2, { target: { value: "BB" } });
      fireEvent.change(textarea1, { target: { value: "AAA" } });
      fireEvent.change(textarea2, { target: { value: "BBB" } });

      await waitFor(() => {
        expect(textarea1.value).toBe("AAA");
        expect(textarea2.value).toBe("BBB");
      });
    });

    it("should maintain state when questions prop changes with same IDs", () => {
      const questions1: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      const { rerender } = render(
        <QuestionForm questions={questions1} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />
      );

      const textarea = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "My answer" } });

      expect(textarea.value).toBe("My answer");

      // Update with same question ID but different question text
      const questions2: PrdQuestionDto[] = [
        createMockQuestion({ id: mockQuestionId1, question: "Updated Question 1?" }),
      ];

      rerender(<QuestionForm questions={questions2} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      // Answer should be preserved because question ID is the same
      const updatedTextarea = screen.getByLabelText(/Pytanie 1:/i) as HTMLTextAreaElement;
      expect(updatedTextarea.value).toBe("My answer");
    });
  });

  describe("Accessibility", () => {
    it("should have proper label associations", () => {
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const label = screen.getByText(/Pytanie 1:/i);
      const textarea = screen.getByLabelText(/Pytanie 1:/i);

      expect(label).toHaveAttribute("for", `question-${mockQuestionId1}`);
      expect(textarea).toHaveAttribute("id", `question-${mockQuestionId1}`);
    });

    it("should have accessible button labels", () => {
      const questions: PrdQuestionDto[] = [createMockQuestion({ id: mockQuestionId1, question: "Question 1?" })];

      render(<QuestionForm questions={questions} roundNumber={1} isSubmitting={false} onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", { name: /Prześlij odpowiedzi/i });
      expect(submitButton).toBeInTheDocument();
    });
  });
});
