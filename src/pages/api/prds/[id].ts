import type { APIRoute } from "astro";
import { prdIdSchema } from "../../../lib/validation/prds";
import {
  getPrdById,
  PrdFetchingError,
  PrdNotFoundError,
  updatePrd,
  PrdUpdateError,
  PrdConflictError,
  PrdNameConflictError,
  deletePrd,
} from "../../../lib/services/prds";
import { updatePrdSchema } from "../../../lib/validation/prds";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const { user, supabase } = locals;
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const result = prdIdSchema.safeParse(params);
  if (!result.success) {
    return new Response(JSON.stringify({ error: "Invalid PRD ID format" }), { status: 400 });
  }

  const { id } = result.data;

  try {
    const prd = await getPrdById(supabase, id);
    return new Response(JSON.stringify(prd), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof PrdNotFoundError) {
      return new Response(JSON.stringify({ error: "PRD not found" }), { status: 404 });
    }

    if (error instanceof PrdFetchingError) {
      // TODO: Add logging
      return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }

    // TODO: Add logging
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { user, supabase } = locals;
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const idValidationResult = prdIdSchema.safeParse(params);
  if (!idValidationResult.success) {
    return new Response(JSON.stringify({ error: "Invalid PRD ID format" }), { status: 400 });
  }

  const { id } = idValidationResult.data;

  let body;
  try {
    body = await request.json();
  } catch {
    // If JSON parsing fails or body is empty, treat as empty object
    body = {};
  }

  if (Object.keys(body).length === 0) {
    try {
      const prd = await getPrdById(supabase, id);
      return new Response(JSON.stringify(prd), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (error instanceof PrdNotFoundError) {
        return new Response(JSON.stringify({ error: "PRD not found" }), { status: 404 });
      }
      // TODO: Add logging
      return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
  }

  const bodyValidationResult = updatePrdSchema.safeParse(body);

  if (!bodyValidationResult.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request body", details: bodyValidationResult.error.flatten() }),
      {
        status: 400,
      }
    );
  }

  try {
    const prd = await updatePrd(supabase, id, bodyValidationResult.data);
    return new Response(JSON.stringify(prd), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof PrdNotFoundError) {
      return new Response(JSON.stringify({ error: "PRD not found" }), { status: 404 });
    }

    if (error instanceof PrdConflictError) {
      return new Response(JSON.stringify({ error: error.message }), { status: 409 });
    }

    if (error instanceof PrdNameConflictError) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    if (error instanceof PrdUpdateError || error instanceof PrdFetchingError) {
      // TODO: Add logging
      return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }

    // TODO: Add logging
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { supabase } = locals;

  const validation = prdIdSchema.safeParse(params);
  if (!validation.success) {
    return new Response(validation.error.errors[0].message, { status: 400 });
  }

  const { id } = validation.data;

  try {
    await deletePrd(supabase, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof PrdNotFoundError) {
      return new Response(JSON.stringify({ error: "PRD not found" }), { status: 404 });
    }

    // TODO: Add logging
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
};
