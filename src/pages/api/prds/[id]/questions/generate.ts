import type { APIRoute } from "astro";

import { generateNextQuestions } from "../../../../../lib/services/prdQuestion.service";
import { prdIdSchema } from "../../../../../lib/validation/prds";
import { PrdQuestionGenerationError, PrdNotFoundError } from "../../../../../lib/services/prdQuestion.service";

export const prerender = false;

export const POST: APIRoute = async ({ params, locals }) => {
  const { user, supabase } = locals;

  // Check authentication
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate path parameters
  const idValidationResult = prdIdSchema.safeParse(params);
  if (!idValidationResult.success) {
    return new Response(JSON.stringify({ error: "Invalid PRD ID format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = idValidationResult.data;

  try {
    const generatedQuestions = await generateNextQuestions(supabase, id);

    return new Response(JSON.stringify({ questions: generatedQuestions }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof PrdNotFoundError) {
      return new Response(JSON.stringify({ error: "PRD not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdQuestionGenerationError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // TODO: Add logging
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
