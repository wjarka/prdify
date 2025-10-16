# API Endpoint Implementation Plan: Complete PRD

## 1. Endpoint Overview

This endpoint finalizes a Product Requirement Document (PRD). It transitions the PRD's status from `prd_review` to `completed`. Once completed, the PRD is considered locked and cannot be edited further.

## 2. Request Details

-   **HTTP Method**: `POST`
-   **URL Structure**: `/api/prds/{id}/complete`
-   **Parameters**:
    -   Required: `id` (URL path parameter) - The UUID of the PRD to be completed.
-   **Request Body**: None.

## 3. Used Types

-   **`CompletedPrdDto`**: Used for the response body, which returns the full, finalized PRD object. This type is an alias for `PrdDto`.

## 4. Response Details

-   **Success**: `200 OK` with the `CompletedPrdDto` object in the response body.
-   **Error**: See the Error Handling section for details on `4xx` status codes.

## 5. Data Flow

1.  The Astro API route handler at `/api/prds/[id]/complete.ts` receives the `POST` request.
3.  The `id` path parameter is retrieved from the request.
4.  The handler calls the `completePrd(prdId)` method in the `PrdDocumentService`.
5.  The service fetches the PRD from the database, verifying that the `id` exists.
6.  It checks if the PRD's current `status` is `prd_review`. If not, it throws a conflict error.
7.  If the status is correct, the service updates the PRD's `status` to `completed` in the database.
8.  The service returns the updated, complete PRD entity to the handler.
9.  The handler maps the PRD entity to a `CompletedPrdDto` and sends it back to the client with a `200 OK` status.

## 6. Security Considerations

-   **Authentication**: All requests must be authenticated via Supabase. Assume this is already handled by Supabase Auth
-   **Authorization**: RLS will verify that the PRD's `user_id` matches the ID of the authenticated user. Assume this is already done.
-   **State Management**: The endpoint must strictly enforce the status transition logic (`prd_review` -> `completed`) to maintain data integrity and prevent the PRD from being completed from an invalid state.

## 7. Error Handling

| Status Code | Reason |
| :--- | :--- |
| `404 Not Found` | The PRD with the given `id` does not exist or does not belong to the user. |
| `409 Conflict` | The PRD is not in the `prd_review` status and therefore cannot be completed. |

## 8. Performance Considerations

-   This operation consists of a single database read and a single update, so it is expected to be fast and efficient. There are no significant performance bottlenecks anticipated.

## 9. Implementation Steps

1.  **Update Service Layer**:
    -   Open the existing `src/lib/services/prdDocument.service.ts` file.
    -   Add a new method: `completePrd(prdId: string)`.
    -   Inside this method, implement the logic to:
        -   Fetch the PRD by `id`.
        -   Throw a "not found" error if it doesn't exist.
        -   Throw a "conflict" error if its `status` is not `prd_review`.
        -   Update the `status` to `completed`.
        -   Return the updated PRD entity.

2.  **Create API Route**:
    -   Create a new file: `src/pages/api/prds/[id]/complete.ts`.
    -   Implement the `POST` request handler within this file.
    -   The handler should extract the `id` from the URL, and call the `prdDocumentService.completePrd` method.
    -   Map the result to a `CompletedPrdDto` and return it with a `200 OK` status.
    -   Validate `id` with the schema from `src/lib/validation/prds.ts`

3.  **Implement Error Handling**:
    -   Add `try...catch` blocks in the API handler to gracefully handle potential errors thrown from the service layer (e.g., not found, conflict) and return the appropriate HTTP error responses.
