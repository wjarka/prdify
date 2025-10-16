import type { APIRoute } from "astro";

import { getPrdQuestions, getLatestPrdQuestionRound } from "../../../../../lib/services/prdQuestion.service";
import { PrdRoundParamSchema } from "../../../../../lib/validation/prdQuestion.schema";
import { prdIdSchema } from "../../../../../lib/validation/prds";
import { PrdQuestionFetchingError, PrdNotFoundError } from "../../../../../lib/services/prdQuestion.service";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const { user, supabase } = locals;

  // Check authentication
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Validate path parameters
    const idValidationResult = prdIdSchema.safeParse(params);
    if (!idValidationResult.success) {
      return new Response(JSON.stringify({ error: "Invalid PRD ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id } = idValidationResult.data;

    // Validate round parameter
    const roundValidationResult = PrdRoundParamSchema.safeParse(params.round);
    if (!roundValidationResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid round parameter. Must be 'latest' or a positive integer." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validatedRound = roundValidationResult.data;

    let result;

    // Handle conditional logic based on round parameter
    if (validatedRound === "latest") {
      result = await getLatestPrdQuestionRound(supabase, id);
    } else {
      // For specific round numbers, get questions with round filter
      const paginatedResult = await getPrdQuestions(supabase, id, 1, 100, { roundNumber: validatedRound });

      // Convert paginated result to PrdQuestionRoundDto format
      result = {
        questions: paginatedResult.questions,
      };

      // If no questions found for the specific round, return 404
      if (result.questions.length === 0) {
        return new Response(JSON.stringify({ error: "Round not found or does not belong to the user" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // If no questions found for latest round, it's not an error - return empty array
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific errors
    if (error instanceof PrdNotFoundError) {
      return new Response(JSON.stringify({ error: "PRD not found or does not belong to the user" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdQuestionFetchingError) {
      return new Response(JSON.stringify({ error: "Failed to fetch PRD questions" }), {
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
