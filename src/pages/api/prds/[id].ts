import type { APIRoute } from "astro";
import { getPrdByIdSchema } from "../../../lib/validation/prds";
import { getPrdById, PrdFetchingError, PrdNotFoundError } from "../../../lib/services/prds";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const { user, supabase } = locals;
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const result = getPrdByIdSchema.safeParse(params);
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
