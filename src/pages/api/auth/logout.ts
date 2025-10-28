import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ locals, redirect }) => {
  try {
    // Sign out the user
    const { error } = await locals.supabase.auth.signOut();

    if (error) {
      return new Response(
        JSON.stringify({
          error: "Wystąpił błąd podczas wylogowywania",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Session cookies are automatically cleared by @supabase/ssr
    // Redirect to login page
    return redirect("/auth/login", 303);
  } catch {
    return new Response(
      JSON.stringify({
        error: "Wystąpił błąd serwera podczas wylogowywania",
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
