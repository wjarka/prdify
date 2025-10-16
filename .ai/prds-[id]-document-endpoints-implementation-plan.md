# API Endpoint Implementation Plan: PRD Document Management

## 1. Endpoint Overview

This plan covers the implementation of two related endpoints for managing the final PRD document:

-   **`POST /api/prds/{id}/document`**: Generates the final PRD document content based on the previously approved summary. This action transitions the PRD's status from `planning_review` to `prd_review`.
-   **`PATCH /api/prds/{id}/document`**: Allows the user to edit the content of the generated PRD document. This is only possible while the PRD is in the `prd_review` status.

## 2. Request Details

### `POST /api/prds/{id}/document`

-   **HTTP Method**: `POST`
-   **URL Structure**: `/api/prds/{id}/document`
-   **Parameters**:
    -   Required: `id` (URL path parameter) - The UUID of the PRD.
-   **Request Body**: None.

### `PATCH /api/prds/{id}/document`

-   **HTTP Method**: `PATCH`
-   **URL Structure**: `/api/prds/{id}/document`
-   **Parameters**:
    -   Required: `id` (URL path parameter) - The UUID of the PRD.
-   **Request Body**:
    ```json
    {
      "content": "This is the final, user-edited version of the PRD."
    }
    ```

## 3. Used Types

-   **`PrdDocumentDto`**: Used for the response body of both endpoints to return the document's content.
-   **`UpdatePrdDocumentCommand`**: Used for the request body of the `PATCH` endpoint.

## 4. Response Details

-   **Success (POST)**: `201 Created` with a `PrdDocumentDto` object in the response body.
    ```json
    {
      "content": "# Final PRD Document..."
    }
    ```
-   **Success (PATCH)**: `200 OK` with a `PrdDocumentDto` object in the response body.
-   **Error**: See the Error Handling section for details on `4xx` and `5xx` status codes.

## 5. Data Flow

1.  The Astro API route handler receives the incoming request.
2.  The user's session is retrieved from `context.locals.user`.
3.  The `id` path parameter is validated. For the `PATCH` request, the body is validated using a Zod schema. (reuse the existing `src/lib/validation/prds.ts` schema)
4.  The appropriate method in the `PrdDocumentService` is called (`generatePrdDocument` for `POST`, `updatePrdDocument` for `PATCH`), passing the `prdId` and `userId`.
5.  **For `generatePrdDocument`**:
    -   The service fetches the PRD from the database
    -   It verifies the PRD status is `planning_review` and that a `summary` exists.
    -   It calls an external AI service (e.g., OpenRouter.ai) with the PRD summary to generate the final document content.
    -   It updates the PRD record in the database with the new `content` and sets the `status` to `prd_review`.
6.  **For `updatePrdDocument`**:
    -   The service fetches the PRD.
    -   It verifies the PRD status is `prd_review`.
    -   It updates the `content` field of the PRD record with the new content from the request body.
7.  The service returns the relevant data (the content) to the handler.
8.  The handler formats the response as a `PrdDocumentDto` and sends it back to the client with the appropriate status code.

## 6. Security Considerations

-   **Authentication**: Requests will be protected by Supabase authentication. The user object will be accessed via `Astro.locals.user`. Unauthenticated requests will be rejected with a `401 Unauthorized` error. Assume it already works.
-   **Authorization**: Ownership will be verified on RLS level. Assume it already works.
-   **Input Validation**: A Zod schema will validate the request body for the `PATCH` endpoint to ensure `content` is a non-empty string. The `id` parameter will be validated as a UUID.

## 7. Error Handling

| Status Code | Reason |
| :--- | :--- |
| `400 Bad Request` | Validation for the `PATCH` request body fails (e.g., `content` is missing or empty). |
| `404 Not Found` | The PRD with the given `id` does not exist or does not belong to the user. |
| `409 Conflict` | - (`POST`) The PRD is not in `planning_review` status or has no summary. <br> - (`PATCH`) The PRD is not in `prd_review` status. |
| `500 Internal Server Error` | The AI service failed to generate the final document. This error should be logged for investigation. |

## 8. Performance Considerations

-   The `POST` endpoint's performance is dependent on the latency of the external AI service. This call can be slow. Consider setting a reasonable timeout for the AI API call. If generation times are consistently long, a move to an asynchronous-native approach with polling or webhooks might be necessary in the future.
-   The `PATCH` endpoint involves a simple database update and is expected to be highly performant.

## 9. Implementation Steps

1.  **Create Validation Schema**:
    -   Create a new file: `src/lib/validation/prdDocument.schema.ts`.
    -   Define a Zod schema for `UpdatePrdDocumentCommand`, requiring `content` to be a `string` with a `min(1)`.

2.  **Create Service Layer**:
    -   Create a new file: `src/lib/services/prdDocument.service.ts`.
    -   Implement the `generatePrdDocument(prdId: string)` method. This method will contain the logic for fetching the PRD, checking its state, calling the AI service, and updating the database.
    -   Implement the `updatePrdDocument(prdId: string, data: UpdatePrdDocumentCommand)` method. This will handle fetching, state validation, and updating the document content.
    -   AI Service call should be mocked for now.

3.  **Create API Route**:
    -   Create a new API route file: `src/pages/api/prds/[id]/document.ts`.
    -   Implement the `POST` request handler. It should handle authentication, call `generatePrdDocument`, and manage success and error responses.
    -   Implement the `PATCH` request handler. It should handle authentication, validate the request body with the Zod schema, call `updatePrdDocument`, and manage responses.

4.  **Error Handling**:
    -   Implement comprehensive error handling in both the service and the API route to catch database errors, validation errors, and business logic violations, returning the appropriate HTTP status codes.
    -   Add logging for the `500 Internal Server Error` scenario in the `POST` handler.
