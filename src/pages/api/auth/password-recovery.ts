import type { APIRoute } from "astro";
import { PasswordRecoverySchema } from "@/lib/validation/auth";
import { mapAuthErrorToPolish } from "@/lib/helpers/auth-errors";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, url }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = PasswordRecoverySchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          message: validationResult.error.errors[0]?.message || "Nieprawidłowe dane wejściowe",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { email } = validationResult.data;

    // Get the origin for the redirect URL
    const origin = url.origin;

    // Send password recovery email
    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
    });

    // Handle rate limiting specifically
    if (error && error.message.toLowerCase().includes("rate limit")) {
      return new Response(
        JSON.stringify({
          message: "Zbyt wiele prób wysłania linku resetującego. Spróbuj ponownie za chwilę.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Log other errors but don't expose them to prevent email enumeration
    if (error) {
      console.error("Password recovery error:", error);
    }

    // Always return success to prevent email enumeration
    // User will receive email only if account exists
    return new Response(
      JSON.stringify({
        message:
          "Jeśli konto o podanym adresie e-mail istnieje, wysłaliśmy link do resetowania hasła. Sprawdź swoją skrzynkę pocztową.",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unexpected error during password recovery:", error);
    return new Response(
      JSON.stringify({
        message: "Wystąpił błąd serwera podczas przetwarzania żądania",
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

