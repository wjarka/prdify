# API Endpoint Implementation Plan: PRD Rounds

## 1. Endpoint Overview

This plan outlines the implementation of a GET endpoint for retrieving questions associated with a Product Requirement Document (PRD). This endpoint allows clients to fetch a set of questions from either the latest round or a specific round number.

-   `GET /api/prds/{id}/rounds/{round}`: Retrieves all questions for a specified PRD. The `{round}` parameter can be a specific round number or the literal string `'latest'`.

## 2. Request Details

### `GET /api/prds/{id}/rounds/{round}`

-   **HTTP Method**: `GET`
-   **URL Structure**: `/api/prds/{id}/rounds/{round}`
-   **Parameters**:
    -   **Path Parameters**:
        -   `id` (string, UUID, required): The unique identifier for the PRD.
        -   `round` (string | number, required): The specific round number to retrieve or the string `'latest'`.

## 3. Used Types

The following Data Transfer Object (DTO) from `src/types.ts` will be used for the response:

-   `PrdQuestionDto`: Represents a single question object.
    ```typescript
    export interface PrdQuestionDto {
      id: string;
      prdId: string;
      roundNumber: number;
      question: string;
      answer: string | null;
      createdAt: string;
    }
    ```
-   `PrdQuestionRoundDto`: The response payload for the endpoint.
    ```typescript
    export interface PrdQuestionRoundDto {
      questions: PrdQuestionDto[];
    }
    ```

## 4. Response Details

### Success Responses

-   **`200 OK`**: Returned when the requested round's questions are found and returned successfully. The response body will be a `PrdQuestionRoundDto` object.

### Error Responses

-   **`400 Bad Request`**: The `{round}` parameter is not a valid positive integer or the string 'latest'.
-   **`404 Not Found`**: The specified PRD or round does not exist or does not belong to the user.
-   **`500 Internal Server Error`**: An unexpected error occurred on the server.

## 5. Data Flow

1.  A `GET` request is sent to `/api/prds/{id}/rounds/{round}`.
2.  Astro's middleware verifies the user's authentication.
3.  The endpoint handler (`[round].ts`) is invoked.
4.  The handler validates the path parameters (`id` as a UUID, and `round` as either 'latest' or a positive integer) using a Zod schema.
5.  Based on the validated `round` parameter, the handler calls the appropriate method in `PrdQuestionService`.
    -   If `round` is `'latest'`, `getLatestPrdQuestionRound(userId, prdId)` is called.
    -   If `round` is a number, the existing `getPrdQuestions(userId, prdId, { roundNumber })` method is called.
6.  The service method executes a Supabase query against the `prd_questions` table, ensuring the `prd_id` matches
7.  If data is found, it is mapped from the database entity (`PrdQuestion`) to the `PrdQuestionDto`.
8.  The service layer returns the array of DTOs to the endpoint handler.
9.  The handler constructs the final `PrdQuestionRoundDto` response object and sends it to the client with a `200 OK` status.

## 6. Security Considerations

-   **Authentication**: All requests will be protected by the existing authentication middleware, which verifies a valid Supabase session.
-   **Authorization**: RLS will handle ownership checks. Assume it already exists.
-   **Input Validation**: Path parameters will be strictly validated using Zod to prevent invalid data from reaching the service layer, protecting against potential SQL injection or unexpected application behavior.

## 7. Performance Considerations

-   **Database Indexing**: To ensure fast query performance, the `prd_questions` table should have a composite index on `(prd_id, round_number)`. This will significantly speed up lookups for specific rounds and finding the latest round.

## 8. Implementation Steps

1.  **Update `PrdQuestionService` (`src/lib/services/prdQuestion.service.ts`)**
    -   Modify the `getPrdQuestions` method signature to accept an optional `options` object containing a `roundNumber`.
    -   If `roundNumber` is provided, add a `.eq('round_number', roundNumber)` filter to the Supabase query.
    -   Create a new public method `getLatestPrdQuestionRound(userId: string, prdId: string)`.
        -   This method will first perform a query to find the maximum `round_number` for the given `prdId`. Re-use getCurrentRoundNumber method from `src/lib/services/prds.ts`
        -   If a max round number is found, it will call `getPrdQuestions` with that number to fetch the questions.
        -   If no rounds exist, it should return an empty array or handle it as a "not found" case.

2.  **Update `types.ts` (`src/types.ts`)**
    -   Remove the `LatestPrdQuestionRoundDto` interface as it is redundant.

3.  **Create Validation Schemas (`src/lib/validation/prdQuestion.schema.ts`)**
    -   Add a new Zod schema to validate the `round` path parameter. It should accept the literal string `'latest'` or a positive integer.
    -   Example: `z.union([z.literal('latest'), z.coerce.number().int().positive()])`

4.  **Implement `GET /api/prds/[id]/rounds/[round].ts`**
    -   Create the file `src/pages/api/prds/[id]/rounds/[round].ts`.
    -   Define an `async function GET({ params, context })`.
    -   Extract the authenticated `user` from `context.locals`.
    -   Use the new Zod schema to validate `params.id` and `params.round`.
    -   Implement conditional logic based on the validated `round` parameter:
        -   If `'latest'`, call `prdQuestionService.getLatestPrdQuestionRound(user.id, params.id)`.
        -   If a number, call `prdQuestionService.getPrdQuestions(user.id, params.id, { roundNumber: validatedRoundNumber, page: 1, limit: 100 })`.
    -   If the service returns no questions, respond with a `404 Not Found`.
    -   If successful, format the response as `PrdQuestionRoundDto` and return with a `200 OK` status.
    -   Implement `try...catch` for error handling.
