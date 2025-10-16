import { z } from "zod";

/**
 * Schema for validating query parameters for GET /api/prds/{id}/questions
 * Validates page and limit parameters for pagination
 */
export const GetPrdQuestionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be a positive integer").default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be a positive integer")
    .max(100, "Limit cannot exceed 100")
    .default(20),
});

/**
 * Schema for validating a single answer in the PATCH request body
 */
export const PrdQuestionAnswerSchema = z.object({
  questionId: z.string().uuid("Question ID must be a valid UUID"),
  text: z.string().min(1, "Answer text cannot be empty").trim(),
});

/**
 * Schema for validating the request body for PATCH /api/prds/{id}/questions
 * Validates the answers array for submitting answers to PRD questions
 */
export const UpdatePrdQuestionsCommandSchema = z.object({
  answers: z.array(PrdQuestionAnswerSchema).min(1, "At least one answer must be provided"),
});

export type GetPrdQuestionsQuery = z.infer<typeof GetPrdQuestionsQuerySchema>;
export type UpdatePrdQuestionsCommand = z.infer<typeof UpdatePrdQuestionsCommandSchema>;
