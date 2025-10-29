import type { APIRoute } from "astro";
import { z } from "zod";
import { mapAuthErrorToPolish } from "@/lib/helpers/auth-errors";

export const prerender = false;

// Simple schema for password only (confirmPassword is validated on frontend)
const UpdatePasswordRequestSchema = z.object({
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = UpdatePasswordRequestSchema.safeParse(body);
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

    const { password } = validationResult.data;

    // Check if user has an active session
    const {
      data: { user },
      error: userError,
    } = await locals.supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          message: "Brak aktywnej sesji. Link resetujący hasło mógł wygasnąć.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Update user password
    const { error: updateError } = await locals.supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      return new Response(
        JSON.stringify({
          message: mapAuthErrorToPolish(updateError.message),
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Sign out user after password change for security
    // User will need to log in with new password
    await locals.supabase.auth.signOut();

    // Success - password updated and user logged out
    return new Response(
      JSON.stringify({
        message: "Hasło zostało pomyślnie zaktualizowane. Zaloguj się ponownie używając nowego hasła.",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unexpected error during password update:", error);
    return new Response(
      JSON.stringify({
        message: "Wystąpił błąd serwera podczas aktualizacji hasła",
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

