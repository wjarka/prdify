# Temporary Development User Notes

We currently mock authentication by injecting a hard-coded Supabase user in the Astro middleware. Once full Supabase Auth integration lands, remove or replace the following temporary pieces:

1. `DEV_SUPABASE_USER_ID` environment variable declared in `src/env.d.ts` and configured in local `.env`. Authentication flows will provide the user context, so this var becomes obsolete.
2. Middleware override in `src/middleware/index.ts` that pulls `DEV_SUPABASE_USER_ID` and sets `context.locals.user`. Replace it with logic that reads the authenticated user from Supabase Auth (likely via session check using Supabase helpers).
3. Any documentation or comments referencing the temporary user (including this file). Once the real auth is wired up, delete `.ai/temporary_user.md` or update it with the new integration steps.

Recommended follow-up once Supabase Auth is ready:

- Use `createServerClient` from `@supabase/auth-helpers-astro` (or equivalent helper) to attach `locals.user` based on the incoming session.
- Ensure API routes still guard against missing `locals.user` by returning `401`.
- Remove the temporary env var from deployment configs and secret stores.
