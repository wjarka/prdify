import { z } from "zod";

const DOCUMENT_CONTENT_MAX_LENGTH = 50000;

/**
 * Schema for validating the request body for PATCH /api/prds/{id}/document
 * Validates the content field for updating PRD documents
 */
export const updatePrdDocumentSchema = z.object({
  content: z
    .string({ required_error: "Treść jest wymagana", invalid_type_error: "Treść musi być tekstem" })
    .trim()
    .min(1, "Treść nie może być pusta")
    .max(DOCUMENT_CONTENT_MAX_LENGTH, `Treść może mieć maksymalnie ${DOCUMENT_CONTENT_MAX_LENGTH} znaków`),
});

export type UpdatePrdDocumentSchema = z.infer<typeof updatePrdDocumentSchema>;
