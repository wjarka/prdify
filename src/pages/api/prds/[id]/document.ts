import type { APIRoute } from "astro";

import { generatePrdDocument, updatePrdDocument } from "../../../../lib/services/prdDocument.service";
import { prdIdSchema } from "../../../../lib/validation/prds";
import { updatePrdDocumentSchema } from "../../../../lib/validation/prdDocument.schema";
import {
  PrdDocumentGenerationError,
  PrdDocumentConflictError,
  PrdDocumentUpdateError,
} from "../../../../lib/services/prdDocument.service";
import { PrdNotFoundError } from "../../../../lib/services/prds";

export const prerender = false;

/**
 * POST /api/prds/{id}/document
 * Generates the final PRD document content based on the previously approved summary.
 * Transitions the PRD status from 'planning_review' to 'prd_review'.
 */
export const POST: APIRoute = async ({ params, locals }) => {
  const { user, supabase } = locals;

  // Check authentication
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Validate PRD ID parameter
    const idValidationResult = prdIdSchema.safeParse(params);
    if (!idValidationResult.success) {
      return new Response(JSON.stringify({ error: "Invalid PRD ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id } = idValidationResult.data;

    // Generate the document using the service
    const content = await generatePrdDocument(supabase, id);

    // Return success response with the generated document content
    return new Response(JSON.stringify({ content }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific error types
    if (error instanceof PrdNotFoundError) {
      return new Response(JSON.stringify({ error: "PRD not found or does not belong to the user" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdDocumentConflictError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdDocumentGenerationError) {
      return new Response(JSON.stringify({ error: "Failed to generate PRD document" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PATCH /api/prds/{id}/document
 * Updates the content of a generated PRD document. Only allowed when the PRD is in 'prd_review' status.
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { user, supabase } = locals;

  // Check authentication
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Validate PRD ID parameter
    const idValidationResult = prdIdSchema.safeParse(params);
    if (!idValidationResult.success) {
      return new Response(JSON.stringify({ error: "Invalid PRD ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id } = idValidationResult.data;

    // Parse and validate request body
    const body = await request.json();
    const bodyValidationResult = updatePrdDocumentSchema.safeParse(body);
    if (!bodyValidationResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: bodyValidationResult.error.issues }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { content } = bodyValidationResult.data;

    // Update the document using the service
    const updatedContent = await updatePrdDocument(supabase, id, content);

    // Return success response with the updated document content
    return new Response(JSON.stringify({ content: updatedContent }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific error types
    if (error instanceof PrdNotFoundError) {
      return new Response(JSON.stringify({ error: "PRD not found or does not belong to the user" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdDocumentConflictError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdDocumentUpdateError) {
      return new Response(JSON.stringify({ error: "Failed to update PRD document" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
