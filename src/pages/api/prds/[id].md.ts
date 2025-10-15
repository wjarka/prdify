import type { APIRoute } from "astro";
import { prdIdSchema } from "../../../lib/validation/prds";
import { getPrdById, PrdNotFoundError, PrdFetchingError } from "../../../lib/services/prds";

export const prerender = false;

/**
 * Sanitizes a filename to be safe for Content-Disposition header.
 * Removes or replaces characters that could cause issues in HTTP headers.
 */
function sanitizeFilename(filename: string): string {
  return filename
    .trim()
    .replace(/[^\w\s\-_.]/g, "-") // Replace special chars with dash
    .replace(/\s+/g, "-") // Replace spaces with dash
    .replace(/-+/g, "-") // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes
}

export const GET: APIRoute = async ({ params, locals }) => {
  const { user, supabase } = locals;

  // Check authentication
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Validate PRD ID parameter
  const validation = prdIdSchema.safeParse(params);
  if (!validation.success) {
    return new Response(JSON.stringify({ error: "Invalid PRD ID format" }), { status: 400 });
  }

  const { id } = validation.data;

  try {
    // Get the PRD using existing service method
    const prd = await getPrdById(supabase, id);

    // Verify PRD is completed
    if (prd.status !== "completed") {
      return new Response(JSON.stringify({ error: "PRD must be completed before exporting" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify PRD has content
    if (!prd.content || prd.content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "PRD content is empty and cannot be exported" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Sanitize filename for Content-Disposition header
    const sanitizedName = sanitizeFilename(prd.name);
    const filename = sanitizedName || "prd"; // Fallback if name is empty after sanitization

    // Return Markdown content with appropriate headers
    return new Response(prd.content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.md"`,
      },
    });
  } catch (error) {
    if (error instanceof PrdNotFoundError) {
      return new Response(JSON.stringify({ error: "PRD not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PrdFetchingError) {
      // TODO: Add logging
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // TODO: Add logging for unexpected errors
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
