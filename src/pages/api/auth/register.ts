import type { APIRoute } from "astro";
import { RegisterSchema } from "@/lib/validation/auth";
import { mapAuthErrorToPolish } from "@/lib/helpers/auth-errors";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = RegisterSchema.safeParse(body);
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

    // Attempt to sign up
    const { data, error } = await locals.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return new Response(
        JSON.stringify({
          error: mapAuthErrorToPolish(error.message),
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check if email confirmation is required
    // When Supabase requires email confirmation, user will exist but session might be null
    const requiresEmailConfirmation = data.user && !data.session;

    // Success - session cookies are automatically set by @supabase/ssr (if session exists)
    return new Response(
      JSON.stringify({
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
        requiresEmailConfirmation,
        message: requiresEmailConfirmation
          ? "Konto zostało utworzone. Sprawdź swoją skrzynkę pocztową i potwierdź adres e-mail, aby się zalogować."
          : "Konto zostało utworzone pomyślnie.",
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
        error: "Wystąpił błąd serwera podczas rejestracji",
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
