# API Endpoint Implementation Plan: GET /api/prds/{id}.md

## 1. Endpoint Overview
This endpoint allows users to export the final content of a specific Product Requirement Document (PRD) as a Markdown file. It provides a way to download the completed PRD for offline use, version control, or sharing. Access is restricted to authenticated users who own the document, and the PRD must be in the `completed` state.

## 2. Request Details
-   **HTTP Method**: `GET`
-   **URL Structure**: `/api/prds/{id}.md`
-   **Parameters**:
    -   **Required**:
        -   `id` (URL path parameter): The unique identifier (UUID) of the PRD to be exported.
-   **Request Body**: None.

## 3. Used Types
-   `Prd`: The Supabase table type representing a PRD record, used internally by the `PrdsService`.
-   `PrdStatus`: The enum type for PRD status, used to verify the document is `completed`.

## 4. Response Details
-   **Success Response (200 OK)**:
    -   **Headers**:
        -   `Content-Type: text/markdown`
        -   `Content-Disposition: attachment; filename="<prd-name>.md"` (Note: `<prd-name>` should be a sanitized version of the PRD name).
    -   **Body**: The raw Markdown content (`content` field) of the final PRD.
-   **Error Responses**:
    -   `400 Bad Request`: If the `id` parameter is not a valid UUID.
    -   `404 Not Found`: If no PRD with the given `id` exists.
    -   `409 Conflict`: If the PRD is not in the `completed` status.
    -   `500 Internal Server Error`: For any unexpected server-side errors.

## 5. Data Flow
1.  A client sends a `GET` request to `/api/prds/{id}.md`.
2.  Astro middleware intercepts the request to verify the user's authentication status via their Supabase session. If the user is not authenticated, it returns a `401` error.
3.  The API route handler at `src/pages/api/prds/[id].md.ts` is executed.
4.  The handler extracts the `id` parameter from the URL.
5.  It uses a Zod schema to validate that the `id` is a valid UUID. If validation fails, it returns a `400` error. Use the existing schema to validate id.
6.  The handler retrieves the authenticated user's ID from `Astro.locals.user.id`.
7.  It calls a new `exportPrd(supabase: SupabaseClient, id: string)` method in the `PrdsService`.
8.  The `PrdsService` queries the Supabase database to fetch the PRD by its `id`.
9.  The service performs a sequence of checks:
    -   If the PRD exists (if not, throw a "Not Found" error).
    -   If `prd.status` is `'completed'` (if not, throw a "Conflict" error).
    -   If `prd.content` is not null or empty (if it is, throw a "Conflict" error as it's not ready).
10. If all checks pass, the service returns the `prd.name` and `prd.content`.
11. The API handler receives the content and name, constructs a `Response` object with a `200 OK` status, sets the `Content-Type` and `Content-Disposition` headers, and sends the raw Markdown content in the body.
12. If the service throws a typed error, the handler catches it and maps it to the corresponding HTTP error response (`404`, `409`).

## 6. Security Considerations
-   **Authentication**: Handled by Astro middleware, ensuring that only authenticated users can access the route. The `Astro.locals.user` object must be present.
-   **Input Validation**: The `id` parameter will be strictly validated as a UUID using Zod to prevent potential query manipulation or other injection attacks.
-   **Content-Disposition Header**: The filename in the `Content-Disposition` header should be sanitized to prevent potential header injection vulnerabilities. This involves removing or escaping characters that have special meaning in HTTP headers.

## 7. Performance Considerations
-   **Database Query**: The query to fetch the PRD by its `id` will be highly performant, as it will use the primary key index on the `prds` table.
-   **Payload Size**: PRD content is expected to be text-based and of a reasonable size. No special streaming implementation is necessary for the initial version. The impact on network and memory should be minimal.

## 8. Implementation Steps
1.  **Create API Route File**: Create a new file at `src/pages/api/prds/[id].md.ts`.
2.  **Update PrdsService**:
    -   Open `src/lib/services/prds.ts`.
    -   Add a new public method `exportPrd(supabase: SupabaseClient, id: string)`.
    -   Inside this method, implement the logic to fetch the PRD from Supabase.
    -   Add checks for status (`'completed'`).
    -   Throw custom errors (e.g., `NotFoundError`) to be caught by the handler.
    -   Return an object containing the PRD `name` and `content` on success.
4.  **Implement GET Handler**:
    -   In `[id].md.ts`, create an `GET` handler function for the `Astro.request`.
    -   Ensure `export const prerender = false;` is set.
    -   Check for an authenticated user via `Astro.locals.user`.
    -   Parse and validate the `id` parameter using the Zod schema.
    -   Instantiate `PrdsService` and call the `exportPrd` method within a `try...catch` block.
    -   On success, create and return a `new Response()` with the Markdown content, `200` status, and the correct `Content-Type` and `Content-Disposition` headers.
    -   In the `catch` block, handle the custom errors from the service and map them to appropriate `Response` objects with `404`, and `409` status codes. Handle any other unexpected errors with a `500` status.
