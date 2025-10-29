import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client.ts";

// Public paths - Auth pages and public API endpoints
const PUBLIC_PATHS = [
  // Auth pages
  "/auth/login",
  "/auth/register",
  "/auth/password-recovery",
  "/auth/update-password",
  "/auth/callback",
  // Public auth API endpoints (login, register - NOT logout)
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/password-recovery",
  "/api/auth/update-password",
  "/api/auth/callback",
];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Create Supabase server client
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Make supabase available in locals
  locals.supabase = supabase;

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get session data
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Store session and user in locals
  locals.session = session;
  if (user) {
    locals.user = {
      email: user.email,
      id: user.id,
    };
  } else {
    locals.user = null;
  }

  // Check if current path is public
  const isPublicPath = PUBLIC_PATHS.some((path) => url.pathname.startsWith(path));
  const isAuthPage = url.pathname.startsWith("/auth/");

  // Redirect logged-in users away from auth pages (but not from API endpoints)
  if (user && isAuthPage && url.pathname !== "/auth/callback") {
    return redirect("/");
  }

  // Redirect non-logged-in users to login for protected routes
  if (!user && !isPublicPath) {
    return redirect("/auth/login");
  }

  return next();
});
