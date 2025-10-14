import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  const devUserId = import.meta.env.DEV_SUPABASE_USER_ID;

  context.locals.user = devUserId
    ? {
        id: devUserId,
        email: null,
      }
    : null;

  return next();
});
