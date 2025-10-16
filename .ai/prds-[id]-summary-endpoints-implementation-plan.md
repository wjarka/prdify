# API Endpoint Implementation Plan: PRD Summary Sub-Resource

This document outlines the implementation plan for the three endpoints related to the PRD summary sub-resource: generating, updating, and deleting the summary.

---

## `POST /api/prds/{id}/summary`

### 1. Endpoint Overview
This endpoint is responsible for generating an AI-powered summary of the planning session for a specific Product Requirement Document (PRD). A successful operation transitions the PRD status from `planning` to `planning_review`. This is a critical step that moves the user from the question-answering phase to the summary review phase.

### 2. Request Details
- **HTTP Method**: `POST`
- **URL Structure**: `/api/prds/{id}/summary`
- **Parameters**:
  - **Required**:
    - `id` (URL parameter): The unique identifier (UUID) of the PRD.
- **Request Body**: None.

### 3. Used Types
- **Response DTO**: `PrdSummaryDto`
  ```typescript
  // src/types.ts
  export interface PrdSummaryDto {
    summary: string;
  }
  ```

### 4. Response Details
- **Success (201 Created)**: Returns an object containing the generated summary.
  ```json
  {
    "summary": "The AI-generated summary of the entire Q&A session."
  }
  ```
- **Error**: Refer to the Error Handling section.

### 5. Data Flow
1.  The client sends a `POST` request to `/api/prds/{id}/summary`.
2.  Astro middleware verifies the user's authentication status via Supabase.
3.  The API route handler extracts the `id` from the URL.
4.  The handler calls the `generateSummary(prdId)` method in `PrdSummaryService`.
5.  The service fetches the PRD from the `prds` table, ensuring its `status` is `planning`.
6.  The service retrieves all associated questions and answers from the `prd_questions` table for the given PRD.
7.  A prompt is constructed using the PRD's core information and the full Q&A transcript.
8.  The service makes an API call to the AI service (OpenRouter.ai) to generate the summary.
9.  Upon receiving the summary, the service updates the corresponding PRD record in the database by setting the `summary` text and changing the `status` to `planning_review`.
10. The service returns the generated summary to the handler.
11. The handler sends a `201 Created` response to the client with the summary.

### 6. Security Considerations
- **Authentication**: All requests must be authenticated. This will be handled by Supabase middleware. Assume that works.
- **Authorization**: RLS will check for ownership. Ignore for now.
- **Rate Limiting**: AI generation can be costly. Consider implementing rate limiting on this endpoint to prevent abuse.

### 7. Error Handling
- **404 Not Found**: If a PRD with the specified `id` does not exist for the authenticated user.
- **409 Conflict**:
  - If the PRD's status is not `planning`.
  - If the PRD has no associated questions, making summary generation impossible.
  - If the PRD has unanswered questions
- **500 Internal Server Error**:
  - If the AI service fails to generate a summary.
  - If a database error occurs during the update. The error will be logged with relevant context (`prdId`, `userId`).

### 8. Performance Considerations
- The primary performance bottleneck will be the latency of the external AI service call. The client-side application should handle this asynchronous operation gracefully, for example, by displaying a loading indicator.

### 9. Implementation Steps
1.  **Create Service**: Create a new file `src/lib/services/prdSummary.service.ts`.
2.  **Implement `generateSummary`**:
    -   Add a method `generateSummary(prdId: string): Promise<string>`.
    -   Inside, implement the logic described in the Data Flow section.
    -   This includes fetching the PRD and its questions, calling the AI service, and updating the PRD record in the database.
    -   Ensure proper error handling for database queries and AI service calls.
    -   Mock the AI Service for now
3.  **Create API Endpoint**: Create the file `src/pages/api/prds/[id]/summary.ts`.
4.  **Implement `POST` Handler**:
    -   Export a `POST` function that follows the Astro API endpoint conventions.
    -   Extract `id` from `context.params` and `userId` from `context.locals.user`.
    -   Validate that `id` is a valid UUID. Re-use the existing schema in `src/lib/validation/prds.ts`
    -   Call `prdSummaryService.generateSummary()` and handle its success and error responses.
    -   Return the appropriate JSON response and status code.

---

## `PATCH /api/prds/{id}/summary`

### 1. Endpoint Overview
This endpoint allows the user to update the summary text of a PRD. This is only possible when the PRD is in the `planning_review` status, allowing users to refine the AI-generated content before proceeding.

### 2. Request Details
- **HTTP Method**: `PATCH`
- **URL Structure**: `/api/prds/{id}/summary`
- **Parameters**:
  - **Required**:
    - `id` (URL parameter): The unique identifier (UUID) of the PRD.
- **Request Body**:
  ```json
  {
    "summary": "This is the user-edited version of the summary."
  }
  ```

### 3. Used Types
- **Command Model**: `UpdatePrdSummaryCommand`
  ```typescript
  // src/types.ts
  export interface UpdatePrdSummaryCommand {
    summary: string;
  }
  ```
- **Response DTO**: `PrdSummaryDto`

### 4. Response Details
- **Success (200 OK)**: Returns an object with the updated summary.
  ```json
  {
    "summary": "This is the user-edited version of the summary."
  }
  ```
- **Error**: Refer to the Error Handling section.

### 5. Data Flow
1.  The client sends a `PATCH` request with the updated summary in the body.
2.  Astro middleware verifies authentication.
3.  The API route handler validates the request body using the Zod schema.
4.  The handler calls `updateSummary(prdId, data.summary)` in `PrdSummaryService`.
5.  The service fetches the PRD, verifying that the status is `planning_review`.
6.  The service updates the `summary` field in the `prds` table.
7.  The updated summary is returned to the handler.
8.  The handler sends a `200 OK` response with the updated data.

### 6. Security Considerations
- **Authentication & Authorization**: Same as the `POST` endpoint. All operations must be scoped to the authenticated user.
- **Input Validation**: The `summary` field from the request body must be sanitized or properly encoded on the client-side to prevent XSS if it's rendered as HTML. The backend validation will ensure it's a non-empty string.

### 7. Error Handling
- **400 Bad Request**: If the request body fails validation (e.g., `summary` is missing, empty, or not a string).
- **404 Not Found**: If a PRD with the specified `id` does not exist for the user.
- **409 Conflict**: If the PRD's status is not `planning_review`.
- **500 Internal Server Error**: If a database error occurs.

### 8. Performance Considerations
- This is a standard database update operation and should be very fast. No significant performance issues are expected.

### 9. Implementation Steps
1.  **Create Zod Schema**: Create `src/lib/validation/prdSummary.schema.ts`.
    -   Define and export `updatePrdSummarySchema` to validate an object with a non-empty `summary` string.
2.  **Implement `updateSummary`**: In `src/lib/services/prdSummary.service.ts`:
    -   Add a method `updateSummary(prdId: string, summary: string): Promise<string>`.
    -   Implement the logic to fetch, validate status, and update the PRD summary.
3.  **Implement `PATCH` Handler**: In `src/pages/api/prds/[id]/summary.ts`:
    -   Export a `PATCH` function.
    -   Use `updatePrdSummarySchema` to parse and validate the request body.
    -   Call `prdSummaryService.updateSummary()` with the validated data.
    -   Return the appropriate JSON response and status code.

---

## `DELETE /api/prds/{id}/summary`

### 1. Endpoint Overview
This endpoint allows the user to discard the current summary and revert the PRD's status from `planning_review` back to `planning`. This provides an "escape hatch" for users who are unsatisfied with the summary and wish to return to the question-answering phase.

### 2. Request Details
- **HTTP Method**: `DELETE`
- **URL Structure**: `/api/prds/{id}/summary`
- **Parameters**:
  - **Required**:
    - `id` (URL parameter): The unique identifier (UUID) of the PRD.
- **Request Body**: None.

### 3. Used Types
- None.

### 4. Response Details
- **Success (204 No Content)**: An empty response indicating the operation was successful.
- **Error**: Refer to the Error Handling section.

### 5. Data Flow
1.  The client sends a `DELETE` request to `/api/prds/{id}/summary`.
2.  Astro middleware verifies authentication.
3.  The API route handler calls `deleteSummary(prdId)` in `PrdSummaryService`.
4.  The service fetches the PRD, verifying that its status is `planning_review`.
5.  The service performs a database update to set the `summary` field to `NULL` and change the `status` back to `planning`.
6.  The handler receives a successful confirmation from the service.
7.  The handler sends a `204 No Content` response.

### 6. Security Considerations
- **Authentication & Authorization**: Same as the other endpoints. The user must be authenticated and own the PRD.

### 7. Error Handling
- **404 Not Found**: If a PRD with the specified `id` does not exist for the user.
- **409 Conflict**: If the PRD's status is not `planning_review`.
- **500 Internal Server Error**: If a database error occurs.

### 8. Performance Considerations
- This is a simple database update and is expected to be highly performant.

### 9. Implementation Steps
1.  **Implement `deleteSummary`**: In `src/lib/services/prdSummary.service.ts`:
    -   Add a method `deleteSummary(prdId: string): Promise<void>`.
    -   Implement the logic to fetch the PRD, validate its status, and update the record by clearing the summary and reverting the status.
2.  **Implement `DELETE` Handler**: In `src/pages/api/prds/[id]/summary.ts`:
    -   Export a `DELETE` function.
    -   Extract `id`.
    -   Call `prdSummaryService.deleteSummary()`.
    -   Return a `204 No Content` response on success.
