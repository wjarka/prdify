import { z } from "zod";

const SUMMARY_MAX_LENGTH = 10000;

/**
 * Schema for validating the request body for PATCH /api/prds/{id}/summary
 * Validates the summary field for updating PRD summaries
 */
export const updatePrdSummarySchema = z.object({
  summary: z
    .string({ required_error: "Podsumowanie jest wymagane", invalid_type_error: "Podsumowanie musi być tekstem" })
    .trim()
    .min(1, "Podsumowanie nie może być puste")
    .max(SUMMARY_MAX_LENGTH, `Podsumowanie może mieć maksymalnie ${SUMMARY_MAX_LENGTH} znaków`),
});

export type UpdatePrdSummarySchema = z.infer<typeof updatePrdSummarySchema>;
