import type { APIRoute } from "astro";
import { LoginSchema } from "@/lib/validation/auth";
import { mapAuthErrorToPolish } from "@/lib/helpers/auth-errors";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = LoginSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: validationResult.error.errors[0]?.message || "Nieprawidłowe dane wejściowe",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { email, password } = validationResult.data;

    // Attempt to sign in
    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return new Response(
        JSON.stringify({
          error: mapAuthErrorToPolish(error.message),
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Success - session cookies are automatically set by @supabase/ssr
    return new Response(
      JSON.stringify({
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({
        error: "Wystąpił błąd serwera podczas logowania",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
