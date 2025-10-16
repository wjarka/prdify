import type { APIRoute } from "astro";

import { getPrdQuestions, submitAnswers } from "../../../../../lib/services/prdQuestion.service";
import {
  GetPrdQuestionsQuerySchema,
  UpdatePrdQuestionsCommandSchema,
} from "../../../../../lib/validation/prdQuestion.schema";
import { prdIdSchema } from "../../../../../lib/validation/prds";
import {
  PrdQuestionFetchingError,
  PrdQuestionUpdateError,
  PrdQuestionNotFoundError,
  PrdQuestionConflictError,
  PrdNotFoundError,
} from "../../../../../lib/services/prdQuestion.service";

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
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

  // Validate query parameters
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());

  const queryValidationResult = GetPrdQuestionsQuerySchema.safeParse(queryParams);
  if (!queryValidationResult.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid query parameters",
        details: queryValidationResult.error.flatten(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { page, limit } = queryValidationResult.data;

  try {
    const paginatedQuestions = await getPrdQuestions(supabase, id, page, limit);

    return new Response(JSON.stringify(paginatedQuestions), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof PrdNotFoundError) {
      return new Response(JSON.stringify({ error: "PRD not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdQuestionFetchingError) {
      // TODO: Add logging
      return new Response(JSON.stringify({ error: "Failed to fetch PRD questions" }), {
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

export const PATCH: APIRoute = async ({ params, request, locals }) => {
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

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const bodyValidationResult = UpdatePrdQuestionsCommandSchema.safeParse(body);
  if (!bodyValidationResult.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
        details: bodyValidationResult.error.flatten(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    await submitAnswers(supabase, id, bodyValidationResult.data);

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof PrdNotFoundError) {
      return new Response(JSON.stringify({ error: "PRD not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdQuestionConflictError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdQuestionNotFoundError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdQuestionUpdateError) {
      // TODO: Add logging
      return new Response(JSON.stringify({ error: "Failed to update PRD questions" }), {
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
