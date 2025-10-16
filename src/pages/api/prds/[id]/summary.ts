import type { APIRoute } from "astro";

import { generateSummary, updateSummary, deleteSummary } from "../../../../lib/services/prdSummary.service";
import { prdIdSchema } from "../../../../lib/validation/prds";
import { updatePrdSummarySchema } from "../../../../lib/validation/prdSummary.schema";
import {
  PrdSummaryGenerationError,
  PrdSummaryConflictError,
  PrdSummaryUpdateError,
} from "../../../../lib/services/prdSummary.service";
import { PrdNotFoundError } from "../../../../lib/services/prds";

export const prerender = false;

/**
 * POST /api/prds/{id}/summary
 * Generates an AI-powered summary of the planning session for a specific PRD.
 * Transitions the PRD status from 'planning' to 'planning_review'.
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

    // Generate the summary using the service
    const summary = await generateSummary(supabase, id);

    // Return success response with the generated summary
    return new Response(JSON.stringify({ summary }), {
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

    if (error instanceof PrdSummaryConflictError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdSummaryGenerationError) {
      return new Response(JSON.stringify({ error: "Failed to generate PRD summary" }), {
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
 * PATCH /api/prds/{id}/summary
 * Updates the summary text of a PRD. Only allowed when the PRD is in 'planning_review' status.
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
    const bodyValidationResult = updatePrdSummarySchema.safeParse(body);
    if (!bodyValidationResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: bodyValidationResult.error.issues }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { summary } = bodyValidationResult.data;

    // Update the summary using the service
    const updatedSummary = await updateSummary(supabase, id, summary);

    // Return success response with the updated summary
    return new Response(JSON.stringify({ summary: updatedSummary }), {
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

    if (error instanceof PrdSummaryConflictError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdSummaryUpdateError) {
      return new Response(JSON.stringify({ error: "Failed to update PRD summary" }), {
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
 * DELETE /api/prds/{id}/summary
 * Deletes the summary and reverts PRD status from 'planning_review' back to 'planning'.
 * This provides an "escape hatch" for users who want to return to the question-answering phase.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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

    // Delete the summary using the service
    await deleteSummary(supabase, id);

    // Return success response with no content
    return new Response(null, {
      status: 204,
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

    if (error instanceof PrdSummaryConflictError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdSummaryUpdateError) {
      return new Response(JSON.stringify({ error: "Failed to delete PRD summary" }), {
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
