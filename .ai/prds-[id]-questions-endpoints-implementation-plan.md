# API Endpoint Implementation Plan: PRD Questions

This document provides a detailed implementation plan for the `GET` and `PATCH` endpoints under `/api/prds/{id}/questions`.

---

# Endpoint: `GET /api/prds/{id}/questions`

## 1. Endpoint Overview
This endpoint retrieves a paginated list of all questions and their corresponding answers for a specific Product Requirement Document (PRD). It allows clients to view the history of the planning session.

## 2. Request Details
- **HTTP Method**: `GET`
- **URL Structure**: `/api/prds/{id}/questions`
- **Parameters**:
  - **Path**:
    - `id` (UUID, Required): The unique identifier of the PRD.
  - **Query**:
    - `page` (number, Optional, default: 1): The page number for pagination.
    - `limit` (number, Optional, default: 20): The number of items per page.
- **Request Body**: None.

## 3. Used Types
- **DTOs** (from `src/types.ts`):
  - `PaginatedPrdQuestionsDto`: The root object for the response.
  - `PrdQuestionDto`: Represents a single question object.
  - `Pagination`: Represents the pagination metadata.

## 4. Response Details
- **Success (200 OK)**: Returns a `PaginatedPrdQuestionsDto` object.
  ```json
  {
    "questions": [
      {
        "id": "uuid-q1",
        "prdId": "uuid-prd1",
        "roundNumber": 1,
        "question": "This is a question from the AI.",
        "answer": "This is the user's answer.",
        "createdAt": "iso_timestamp"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 1,
      "totalPages": 1
    }
  }
  ```
- **Error**: Returns a standard error response object with relevant status codes.

## 5. Data Flow
1.  The client sends a `GET` request to `/api/prds/{id}/questions`.
2.  The Astro endpoint handler receives the request.
3.  Astro middleware verifies the user's authentication status using Supabase session.
4.  The handler validates the `id` path parameter (as UUID) and the `page`/`limit` query parameters (as positive integers) using a Zod schema.
5.  The handler calls the `PrdQuestionService.getPrdQuestions()` method, passing the Supabase client, PRD ID, and pagination parameters.
6.  The service first fetches the PRD by its ID to verify its existence.
7.  The service executes two database queries: one to count the total number of questions for the PRD and another to fetch the questions for the current page using `offset` and `limit`.
8.  The service maps the database records to `PrdQuestionDto` objects.
9. The service constructs and returns the `PaginatedPrdQuestionsDto` object.
10. The handler receives the DTO and sends it back to the client as a JSON response with a 200 status code.

## 6. Security Considerations
- **Authentication**: All requests must be authenticated. This will be enforced by Astro middleware checking for a valid Supabase session cookie. (assume it's done)
- **Authorization**: The service layer must verify that the `user_id` on the fetched `prds` record matches the ID of the currently authenticated user. This prevents users from accessing questions of PRDs they do not own. Assume it's done via RLS (it will be enabled later)
- **Input Validation**: All incoming path and query parameters will be strictly validated using Zod schemas to prevent injection attacks and ensure data integrity.

## 7. Error Handling
- **400 Bad Request**: Returned if `page` or `limit` are not valid positive integers.
- **404 Not Found**: Returned if no PRD exists with the provided `id`.
- **500 Internal Server Error**: Returned for any unhandled exceptions, such as a database connection failure.

## 8. Performance Considerations
- **Database Indexing**: Ensure that the `prd_id` column on the `prd_questions` table is indexed to allow for efficient querying.
- **Pagination Limits**: To prevent abuse, the `limit` parameter should be capped at a reasonable maximum value (e.g., 100) at the service level.

## 9. Implementation Steps
1.  **Create Validation Schema**: In `src/lib/validation/`, create `prdQuestion.schema.ts`. Add a Zod schema `GetPrdQuestionsQuerySchema` to validate `page` and `limit`.
2.  **Create Service**: Create a new file `src/lib/services/prdQuestion.service.ts`.
3.  **Implement `getPrdQuestions`**: Inside `PrdQuestionService`, create an async method `getPrdQuestions`. This method will contain the core data fetching and authorization logic described in the "Data Flow" section.
4.  **Create API Endpoint**: Create the API route file at `src/pages/api/prds/[id]/questions/index.ts`.
5.  **Implement GET Handler**: In the new route file, export an async function `GET`. This function will:
    a. Get the Supabase client and user session from `context.locals`.
    b. Validate path and query parameters using the Zod schema.
    c. Call the `PrdQuestionService.getPrdQuestions` method.
    d. Return the result with a 200 status or an appropriate error response.

---

# Endpoint: `PATCH /api/prds/{id}/questions`

## 1. Endpoint Overview
This endpoint allows a user to submit answers to one or more questions for a PRD. It is a state-changing operation that is only permitted when the PRD is in the `planning` status. It saves the answers but does not trigger the generation of new questions.

## 2. Request Details
- **HTTP Method**: `PATCH`
- **URL Structure**: `/api/prds/{id}/questions`
- **Parameters**:
  - **Path**:
    - `id` (UUID, Required): The unique identifier of the PRD.
- **Request Body**:
  ```json
  {
    "answers": [
      {
        "questionId": "uuid-of-question-1",
        "text": "This is the answer to the first question."
      }
    ]
  }
  ```

## 3. Used Types
- **Command Models** (from `src/types.ts`):
  - `UpdatePrdQuestionsCommand`: Represents the entire request body.
  - `PrdQuestionAnswer`: Represents a single item in the `answers` array.

## 4. Response Details
- **Success (204 No Content)**: Returned upon successful saving of the answers. The response has no body.
- **Error**: Returns a standard error response object with relevant status codes.

## 5. Data Flow
1.  The client sends a `PATCH` request to `/api/prds/{id}/questions` with the answers in the request body.
2.  The Astro endpoint handler receives the request.
3.  Astro middleware verifies user authentication.
4.  The handler validates the `id` path parameter and the request body using Zod schemas.
5.  The handler calls `PrdQuestionService.submitAnswers()`, passing the Supabase client, PRD ID, and the validated request body.
6.  The service fetches the PRD by its ID. It verifies existence and that its `status` is `'planning'`.
7.  The service queries the `prd_questions` table to ensure that every `questionId` from the payload exists and belongs to the specified `prd_id`.
8.  The service iterates through the provided answers and executes an `update` statement for each one, setting the `answer` text in the corresponding `prd_questions` record.
9.  If all updates succeed, the service returns a success indicator.
10. The handler receives the success signal and returns a `204 No Content` response.

## 6. Security Considerations
- **Authentication**: Enforced via Astro middleware.
- **Authorization**: RLS will verify that the user owns the PRD before making any changes. Assume it's done.
- **State Management**: The service must reject the request if the PRD is not in the `planning` status to prevent unauthorized state transitions.
- **Data Validation**:
    - The request body will be strictly validated by Zod to ensure it conforms to the `UpdatePrdQuestionsCommand` structure.
    - The service will perform a crucial secondary validation to confirm that each `questionId` submitted belongs to the PRD specified in the URL, preventing data corruption across different PRDs.

## 7. Error Handling
- **400 Bad Request**: Returned if the request body is invalid (e.g., `answers` is an empty array, `text` is an empty string).
- **404 Not Found**: Returned if the PRD does not exist, or if any `questionId` from the payload is not found or does not belong to the specified PRD.
- **409 Conflict**: Returned if the PRD's status is not `planning`.
- **500 Internal Server Error**: Returned for unexpected database errors.

## 8. Performance Considerations
- **Database Indexing**: The `id` (primary key) on `prd_questions` will be used for updates, which is highly performant.
- **Transaction Management**: For simplicity, updates will be performed sequentially. While a database transaction would ensure atomicity, the risk of partial failure is low and acceptable for this use case. If requirements change, this can be revisited.

## 9. Implementation Steps
1.  **Create Validation Schema**: In `src/lib/validation/prdQuestion.schema.ts`, add a Zod schema `UpdatePrdQuestionsCommandSchema` to validate the request body.
2.  **Implement `submitAnswers`**: In the existing `PrdQuestionService`, create an async method `submitAnswers`. This method will implement the logic for validation, authorization, and database updates as described in the "Data Flow" section.
3.  **Implement PATCH Handler**: In the route file at `src/pages/api/prds/[id]/questions/index.ts`, export an async function `PATCH`. This function will:
    a. Get the Supabase client and user session.
    b. Validate the path parameter and request body.
    c. Call the `PrdQuestionService.submitAnswers` method.
    d. Return a `204 No Content` response on success or an appropriate error response.
