import type { APIContext } from "astro";
import { ZodError } from "zod";

import { createPrd } from "../../../lib/services/prds";
import { createPrdSchema } from "../../../lib/validation/prds";
import type { PrdDto } from "../../../types";

export const prerender = false;

function jsonResponse<T>(status: number, body: T) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function POST(context: APIContext): Promise<Response> {
  try {
    if (!context.locals.user?.id) {
      return jsonResponse(401, { message: "User not authenticated" });
    }

    let payload: unknown;

    try {
      payload = await context.request.json();
    } catch {
      return jsonResponse(400, { message: "Invalid JSON payload" });
    }

    let command;

    try {
      command = createPrdSchema.parse(payload);
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonResponse(400, { message: "Validation failed", details: error.flatten() });
      }

      throw error;
    }

    try {
      const prd = await createPrd(context.locals.supabase, context.locals.user.id, command);
      const response = jsonResponse<PrdDto>(201, prd);
      response.headers.set("Location", `/api/prds/${prd.id}`);
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "PrdNameConflictError") {
        return jsonResponse(400, { message: error.message });
      }

      if (error instanceof Error && error.name === "PrdCreationError") {
        return jsonResponse(500, { message: "Failed to create PRD" });
      }

      return jsonResponse(500, { message: "Unexpected error" });
    }
  } catch (error) {
    if (error instanceof Error && error.name === "PrdCreationError") {
      return jsonResponse(500, { message: "Failed to create PRD" });
    }

    if (error instanceof Error && error.name === "PrdNameConflictError") {
      return jsonResponse(400, { message: error.message });
    }

    return jsonResponse(500, { message: "Internal Server Error" });
  }
}

/**
 * Test scenarios to cover:
 * 1. Successful creation with valid payload returns 201 and Location header.
 * 2. Missing authentication returns 401.
 * 3. Invalid JSON payload returns 400 with appropriate message.
 * 4. Validation errors return 400 with flattened Zod details.
 * 5. Duplicate PRD name for same user returns 400 conflict message.
 * 6. Unexpected Supabase failure logs error and returns 500.
 */
