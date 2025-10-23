import { z } from "zod";

/**
 * Schema for validating query parameters for GET /api/prds/{id}/questions
 * Validates page and limit parameters for pagination
 */
export const GetPrdQuestionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Strona musi być dodatnią liczbą całkowitą").default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit musi być dodatnią liczbą całkowitą")
    .max(100, "Limit nie może przekroczyć 100")
    .default(20),
});

/**
 * Schema for validating a single answer in the PATCH request body
 */
export const PrdQuestionAnswerSchema = z.object({
  questionId: z.string().uuid("ID pytania musi być prawidłowym UUID"),
  text: z.string().min(1, "Odpowiedź nie może być pusta").trim(),
});

/**
 * Schema for validating the request body for PATCH /api/prds/{id}/questions
 * Validates the answers array for submitting answers to PRD questions
 */
export const UpdatePrdQuestionsCommandSchema = z.object({
  answers: z.array(PrdQuestionAnswerSchema).min(1, "Przynajmniej jedna odpowiedź musi być podana"),
});

/**
 * Schema for validating the round path parameter in GET /api/prds/{id}/rounds/{round}
 * Accepts either the literal string 'latest' or a positive integer
 */
export const PrdRoundParamSchema = z.union([
  z.literal("latest"),
  z.coerce.number().int().positive("Numer rundy musi być dodatnią liczbą całkowitą"),
]);

export type GetPrdQuestionsQuery = z.infer<typeof GetPrdQuestionsQuerySchema>;
export type UpdatePrdQuestionsCommand = z.infer<typeof UpdatePrdQuestionsCommandSchema>;
export type PrdRoundParam = z.infer<typeof PrdRoundParamSchema>;
