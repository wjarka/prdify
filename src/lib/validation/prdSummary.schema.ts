import { z } from "zod";

const SUMMARY_MAX_LENGTH = 10000;

/**
 * Schema for validating the request body for PATCH /api/prds/{id}/summary
 * Validates the summary field for updating PRD summaries
 */
export const updatePrdSummarySchema = z.object({
  summary: z
    .string({ required_error: "Summary is required", invalid_type_error: "Summary must be a string" })
    .trim()
    .min(1, "Summary cannot be empty")
    .max(SUMMARY_MAX_LENGTH, `Summary must be at most ${SUMMARY_MAX_LENGTH} characters long`),
});

export type UpdatePrdSummarySchema = z.infer<typeof updatePrdSummarySchema>;
