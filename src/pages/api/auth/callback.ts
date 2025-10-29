import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  if (!code) {
    return redirect("/auth/login?error=missing_code");
  }

  try {
    // Exchange the code for a session
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error exchanging code for session:", error);
      return redirect("/auth/login?error=invalid_code");
    }

    // Successful authentication - redirect to the next page
    return redirect(next);
  } catch (err) {
    console.error("Unexpected error during callback:", err);
    return redirect("/auth/login?error=unexpected_error");
  }
};

