import type { APIRoute } from "astro";

import { completePrd } from "../../../../lib/services/prds";
import { prdIdSchema } from "../../../../lib/validation/prds";
import { PrdConflictError, PrdUpdateError } from "../../../../lib/services/prds";
import { PrdNotFoundError } from "../../../../lib/services/prds";
import type { CompletedPrdDto } from "../../../../types";

export const prerender = false;

/**
 * POST /api/prds/{id}/complete
 * Finalizes a Product Requirement Document (PRD) by transitioning its status from 'prd_review' to 'completed'.
 * Once completed, the PRD is considered locked and cannot be edited further.
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

    // Complete the PRD using the service
    const completedPrd = await completePrd(supabase, id);

    // Return success response with the completed PRD
    return new Response(JSON.stringify(completedPrd as CompletedPrdDto), {
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

    if (error instanceof PrdConflictError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdUpdateError) {
      return new Response(JSON.stringify({ error: "Failed to complete PRD" }), {
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
