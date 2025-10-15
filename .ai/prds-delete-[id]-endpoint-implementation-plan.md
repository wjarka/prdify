# API Endpoint Implementation Plan: `DELETE /api/prds/{id}`

## 1. Endpoint Overview
This document outlines the implementation plan for the `DELETE /api/prds/{id}` API endpoint. The purpose of this endpoint is to allow an authenticated user to permanently delete one of their Product Requirement Documents (PRDs). The deletion will be cascaded to all associated data, including all rounds of questions and answers related to the PRD.

## 2. Request Details
- **HTTP Method**: `DELETE`
- **URL Structure**: `/api/prds/{id}`
- **Parameters**:
  - **Path Parameters**:
    - `id` (UUID string, required): The unique identifier of the PRD to be deleted.
- **Request Body**: None.

## 3. Used Types
No DTOs or Command Models are directly used in the request or response body for this endpoint.

## 4. Response Details
- **Success Response**:
  - **Code**: `204 No Content`
  - **Body**: None.
- **Error Responses**:
  - **Code**: `400 Bad Request` - If the `id` parameter is not a valid UUID.
  - **Code**: `404 Not Found` - If a PRD with the specified `id` does not exist.
  - **Code**: `500 Internal Server Error` - For unexpected server-side issues.

## 5. Data Flow
1.  A `DELETE` request is sent to `/api/prds/{id}`.
2.  The Astro middleware intercepts the request and verifies the user's authentication status using the Supabase session. If the user is not authenticated, it returns a `401` response. (out of scope for this)
3.  The `DELETE` handler in `src/pages/api/prds/[id].ts` is invoked.
4.  The handler validates the `id` path parameter using a Zod schema to ensure it is a valid UUID. If validation fails, it returns a `400` response.
5.  The handler retrieves the authenticated `user` from `Astro.locals` and calls the `deletePrd(supabase: SupabaseClient, id: string)` function from the `prds` service (`src/lib/services/prds.ts`).
6. The service executes a `DELETE` command on the `prds` table for the given `id`. The `ON DELETE CASCADE` constraint on the database ensures that all related records in the `prd_questions` table are also deleted automatically.
7. If Supabase returns an error because the row did not exist - the error is handler properly.
8.  The service function returns a success or error result to the handler.
9. The handler receives the result and sends the final HTTP response: `204 No Content` on success or an appropriate error response.

## 6. Security Considerations
- **Authentication**: All requests to this endpoint must be authenticated. It will be handled with Supabase AUth in the future. Not relevant for this implementation.
- **Authorization**: IDOR will be handled by RLS which will be enabled later.
- **Input Validation**: The `id` from the URL will be strictly validated as a UUID using Zod to prevent any potential injection attacks or malformed queries.


## 7. Implementation Steps
1.  **Update Validation Schema**:
    - In `src/lib/validation/prds.ts`, to promote reusability, rename the existing `getPrdByIdSchema` to `prdIdSchema` and its associated type `GetPrdByIdSchema` to `PrdIdSchema`.
    - Update all existing references to `getPrdByIdSchema` in the codebase (e.g., in `src/pages/api/prds/[id].ts`) to use the new name `prdIdSchema`.

2.  **Update Prds Service**:
    - In `src/lib/services/prds.ts`, create a new async function `deletePrd`.
    - This function will accept the `supabase` client and the `id` of the PRD to delete. Authorization will be handled by Supabase's Row Level Security (RLS) and is not part of this function's logic.
    - The function will attempt to delete the PRD and will check the `count` of deleted rows to determine if the operation was successful. If `count` is 0, it means the PRD was not found.
    ```typescript
    // In src/lib/services/prds.ts

    export async function deletePrd(
      supabase: SupabaseClient,
      id: string
    ): Promise<{ error: { status: number; message: string } | null }> {
      const { error, count } = await supabase
        .from("prds")
        .delete({ count: "exact" })
        .eq("id", id);

      if (error) {
        console.error("Error deleting PRD:", error);
        return { error: { status: 500, message: "Internal Server Error" } };
      }

      if (count === 0) {
        return { error: { status: 404, message: "PRD not found" } };
      }

      return { error: null };
    }
    ```

3.  **Create API Endpoint**:
    - In `src/pages/api/prds/[id].ts`, implement the `DELETE` request handler.
    - Use `Astro.locals` to get the Supabase client.
    - Use the `prdIdSchema` to validate the `id` from `Astro.params`.
    - Call the `prdsService.deletePrd` function with the validated ID.
    - Return the appropriate response based on the service's result.
    ```typescript
    // In src/pages/api/prds/[id].ts

    import type { APIRoute } from "astro";
    import * as prdsService from "../../../../lib/services/prds";
    import { prdIdSchema } from "../../../../lib/validation/prds";

    export const prerender = false;

    // ... (existing GET and PATCH handlers)

    export const DELETE: APIRoute = async ({ params, locals }) => {
      const { supabase } = locals;

      const validation = prdIdSchema.safeParse(params);
      if (!validation.success) {
        return new Response(validation.error.errors[0].message, { status: 400 });
      }

      const { id } = validation.data;
      const { error } = await prdsService.deletePrd(supabase, id);

      if (error) {
        return new Response(error.message, { status: error.status });
      }

      return new Response(null, { status: 204 });
    };
    ```
