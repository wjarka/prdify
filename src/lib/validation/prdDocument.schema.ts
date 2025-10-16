import { z } from "zod";

const DOCUMENT_CONTENT_MAX_LENGTH = 50000;

/**
 * Schema for validating the request body for PATCH /api/prds/{id}/document
 * Validates the content field for updating PRD documents
 */
export const updatePrdDocumentSchema = z.object({
  content: z
    .string({ required_error: "Content is required", invalid_type_error: "Content must be a string" })
    .trim()
    .min(1, "Content cannot be empty")
    .max(DOCUMENT_CONTENT_MAX_LENGTH, `Content must be at most ${DOCUMENT_CONTENT_MAX_LENGTH} characters long`),
});

export type UpdatePrdDocumentSchema = z.infer<typeof updatePrdDocumentSchema>;
