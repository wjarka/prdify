# REST API Plan

## 1. Resources

- **PRD (`/prds`)**: Represents a Product Requirement Document.
  - Corresponds to the `prds` table in the database.
  - This is the main resource, encompassing the entire lifecycle from planning to the final document.
- **PRD Question (`/prds/{prdId}/questions`)**: Represents a single question-and-answer pair within a planning session. It corresponds to a row in the `prd_questions` table. Multiple questions can belong to the same planning round, identified by `round_number`.
- **PRD Summary (`/prds/{prdId}/summary`)**: Represents the AI-generated summary of the planning session.
  - Corresponds to the `summary` field in the `prds` table.
- **PRD Document (`/prds/{prdId}/document`)**: Represents the final, AI-generated PRD content.
  - Corresponds to the `content` field in the `prds` table.

## 2. Endpoints

### PRDs Resource

#### `GET /api/prds`

- **Description**: Retrieve a list of all PRDs for the authenticated user.
- **Query Parameters**:
  - `page` (number, optional, default: 1): For pagination.
  - `limit` (number, optional, default: 10): Items per page.
  - `sortBy` (string, optional, default: 'updated_at'): Field to sort by.
  - `order` (string, optional, default: 'desc'): Sort order (`asc` or `desc`).
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "My New Feature PRD",
        "status": "planning_review",
        "createdAt": "iso_timestamp",
        "updatedAt": "iso_timestamp"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 1,
      "totalPages": 1
    }
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: User is not authenticated.

---

#### `POST /api/prds`

- **Description**: Create a new PRD. This endpoint only creates the PRD resource itself. To start the planning session, you must make a subsequent call to `POST /api/prds/{id}/questions/generate` to create the first round of questions.
- **Request Body**:
  ```json
  {
    "name": "My New Feature PRD",
    "mainProblem": "Users need a way to do X.",
    "inScope": "A new button and a modal.",
    "outOfScope": "Backend changes for the modal.",
    "successCriteria": "Users can complete the flow in under 1 minute."
  }
  ```
- **Response (201 Created)**: Returns the newly created PRD object, ready for the first round of questions to be generated.
  ```json
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "My New Feature PRD",
    "mainProblem": "Users need a way to do X.",
    "inScope": "A new button and a modal.",
    "outOfScope": "Backend changes for the modal.",
    "successCriteria": "Users can complete the flow in under 1 minute.",
    "status": "planning",
    "summary": null,
    "content": null,
    "currentRoundNumber": 0,
    "createdAt": "iso_timestamp",
    "updatedAt": "iso_timestamp"
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Validation failed (e.g., empty fields, name not unique for the user).
  - `401 Unauthorized`: User is not authenticated.

---

#### `GET /api/prds/{id}`

- **Description**: Retrieve a single PRD by its ID. This endpoint returns the core metadata of the PRD but excludes the full question history for performance reasons. Use `GET /api/prds/{id}/questions` to fetch the questions for a specific round.
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "My New Feature PRD",
    "mainProblem": "...",
    "inScope": "...",
    "outOfScope": "...",
    "successCriteria": "...",
    "status": "planning",
    "summary": "...",
    "content": "...",
    "currentRoundNumber": 1,
    "createdAt": "iso_timestamp",
    "updatedAt": "iso_timestamp"
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: User is not authenticated.
  - `403 Forbidden`: User does not have permission to access this PRD.
  - `404 Not Found`: PRD with the given ID does not exist.

---

#### `PATCH /api/prds/{id}`

- **Description**: Update the metadata of a PRD, such as its name.
- **Request Body**:
  ```json
  {
    "name": "Updated PRD Name"
  }
  ```
- **Response (200 OK)**: Returns the updated PRD object.
- **Error Codes**:
  - `400 Bad Request`: Validation error (e.g., name is empty or not unique).
  - `401 Unauthorized`: User is not authenticated.
  - `403 Forbidden`: User does not have permission to update this PRD.
  - `404 Not Found`: PRD with the given ID does not exist.
  - `409 Conflict`: The PRD is completed and cannot be modified.

---

#### `DELETE /api/prds/{id}`

- **Description**: Delete a PRD and all its associated data (questions).
- **Response (204 No Content)**:
- **Error Codes**:
  - `401 Unauthorized`: User is not authenticated.
  - `403 Forbidden`: User does not have permission to delete this PRD.
  - `404 Not Found`: PRD with the given ID does not exist.

---

#### `GET /api/prds/{id}.md`

- **Description**: Export the final PRD content as a Markdown file. This is only available for PRDs with a `completed` status. The response `Content-Type` should be `text/markdown`.
- **Response (200 OK)**:
  - The body of the response is the raw Markdown content of the final PRD.
- **Error Codes**:
  - `401 Unauthorized`: User is not authenticated.
  - `403 Forbidden`: User does not have permission to access this PRD.
  - `404 Not Found`: PRD with the given ID does not exist.
  - `409 Conflict`: The PRD is not in the `completed` status.

### PRD Questions Sub-Resource

#### `GET /api/prds/{id}/questions`

- **Description**: Retrieve all questions for a specific PRD, with pagination.
- **Query Parameters**:
  - `page` (number, optional, default: 1): The page number for retrieving all questions.
  - `limit` (number, optional, default: 20): The number of questions per page.
- **Response (200 OK)**: Returns a paginated list of all questions.
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
- **Error Codes**:
    - `401 Unauthorized`: User is not authenticated.
    - `403 Forbidden`: User does not have permission to access these questions.
    - `404 Not Found`: PRD with the given ID does not exist.

---

#### `PATCH /api/prds/{id}/questions`

- **Description**: Submit answers for one or more questions in the current round. This endpoint only saves the answers and does not trigger the next round of generation.
- **Request Body**:
  ```json
  {
    "answers": [
      {
        "questionId": "uuid-of-question-1",
        "text": "This is the answer to the first question."
      },
      {
        "questionId": "uuid-of-question-2",
        "text": "This is the answer to the second question."
      }
    ]
  }
  ```
- **Response (204 No Content)**:
- **Error Codes**:
  - `400 Bad Request`: Validation failed (e.g., `answers` array is empty, `text` is empty).
  - `401 Unauthorized`: User is not authenticated.
  - `403 Forbidden`: User does not have permission.
  - `404 Not Found`: A `questionId` provided does not exist.
  - `409 Conflict`: The PRD is not in the `planning` status.
  - `500 Internal Server Error`: AI service failed to generate new questions.

---

#### `POST /api/prds/{id}/questions/generate`

- **Description**: Generate the next round of questions from the AI. This should be called after submitting answers when the user decides to "Continue planning", or immediately after creating a new PRD to get the first round of questions.
- **Response (201 Created)**: Returns an object containing the array of newly generated questions for the next round.
  ```json
  {
    "questions": [
      {
        "id": "uuid-q3",
        "prdId": "uuid-prd1",
        "roundNumber": 2,
        "question": "A new question generated by the AI.",
        "answer": null,
        "createdAt": "iso_timestamp"
      }
    ]
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: User is not authenticated.
  - `403 Forbidden`: User does not have permission.
  - `409 Conflict`: The PRD is not in the `planning` status.
  - `500 Internal Server Error`: AI service failed to generate new questions.

### PRD Rounds Sub-Resource

#### `GET /api/prds/{id}/rounds/{roundNumber}`

- **Description**: Retrieve the questions for a specific round number of a PRD. The `{roundNumber}` parameter can also be the literal string `latest` to fetch the most recent round.
- **Path Parameters**:
    - `roundNumber` (number | "latest", required): The round number to retrieve, or `latest`.
- **Response (200 OK)**:
  ```json
  {
    "questions": [
      {
        "id": "uuid-q-specific",
        "prdId": "uuid-prd1",
        "roundNumber": 1,
        "question": "This is a question from a specific round.",
        "answer": "This is the answer for that question.",
        "createdAt": "iso_timestamp"
      }
    ]
  }
  ```
- **Error Codes**:
    - `400 Bad Request`: `roundNumber` is not a valid number or the string `latest`.
    - `401 Unauthorized`: User is not authenticated.
    - `403 Forbidden`: User does not have permission.
    - `404 Not Found`: PRD or the specified round does not exist.

### PRD Summary Sub-Resource

#### `POST /api/prds/{id}/summary`

- **Description**: Generate the planning session summary. This transitions the PRD status from `planning` to `planning_review`.
- **Response (201 Created)**: Returns an object containing the generated summary.
  ```json
  {
    "summary": "The AI-generated summary of the entire Q&A session."
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: User is not authenticated.
  - `403 Forbidden`: User does not have permission.
  - `409 Conflict`: The PRD is not in the `planning` status or has no questions.
  - `500 Internal Server Error`: AI service failed to generate the summary.

---

#### `PATCH /api/prds/{id}/summary`

- **Description**: Update the user-editable summary text. This is only possible when the PRD is in the `planning_review` status.
- **Request Body**:
  ```json
  {
    "summary": "This is the user-edited version of the summary."
  }
  ```
- **Response (200 OK)**: Returns an object with the updated summary.
- **Error Codes**:
  - `400 Bad Request`: Validation error (e.g., summary is empty).
  - `401 Unauthorized`: User is not authenticated.
  - `403 Forbidden`: User does not have permission.
  - `404 Not Found`: PRD with the given ID does not exist.
  - `409 Conflict`: The PRD is not in the `planning_review` status.

---

#### `DELETE /api/prds/{id}/summary`

- **Description**: Discard the summary and return to the planning phase. This action clears the summary field and transitions the PRD status from `planning_review` back to `planning`.
- **Response (204 No Content)**:
- **Error Codes**:
  - `401 Unauthorized`: User is not authenticated.
  - `403 Forbidden`: User does not have permission.
  - `409 Conflict`: The PRD is not in the `planning_review` status.

### PRD Document Sub-Resource

#### `POST /api/prds/{id}/document`

- **Description**: Generate the final PRD document from the approved summary. This transitions the PRD status from `planning_review` to `prd_review`.
- **Response (201 Created)**: Returns an object containing the generated final PRD content.
  ```json
  {
    "content": "# Final PRD Document..."
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: User is not authenticated.
  - `403 Forbidden`: User does not have permission.
  - `409 Conflict`: The PRD is not in the `planning_review` status or has no summary.
  - `500 Internal Server Error`: AI service failed to generate the final document.

---

#### `PATCH /api/prds/{id}/document`

- **Description**: Update the user-editable final PRD document text. This is only possible when the PRD is in the `prd_review` status.
- **Request Body**:
  ```json
  {
    "content": "This is the final, user-edited version of the PRD."
  }
  ```
- **Response (200 OK)**: Returns an object with the updated document content.
- **Error Codes**:
  - `400 Bad Request`: Validation error (e.g., content is empty).
  - `401 Unauthorized`: User is not authenticated.
  - `403 Forbidden`: User does not have permission.
  - `404 Not Found`: PRD with the given ID does not exist.
  - `409 Conflict`: The PRD is not in the `prd_review` status.

---

#### `POST /api/prds/{id}/complete`

- **Description**: Finalize the PRD. This transitions the PRD status from `prd_review` to `completed`, locking the document from further edits.
- **Response (200 OK)**: Returns the completed PRD object.
- **Error Codes**:
  - `401 Unauthorized`: User is not authenticated.
  - `403 Forbidden`: User does not have permission.
  - `404 Not Found`: PRD with the given ID does not exist.
  - `409 Conflict`: The PRD is not in the `prd_review` status.

## 3. Authentication and Authorization

- **Authentication**: Authentication will be handled by Supabase Auth. The client-side application will interact with the Supabase JS SDK to manage user sign-up, sign-in, and session tokens (JWTs).
- **Authorization**: All API endpoints, implemented as Astro API routes, will be protected. Each request must include a valid JWT in the `Authorization: Bearer <token>` header. The API route will use the Supabase Admin client to verify the token and extract the `user_id`. All database queries will be performed within the context of this authenticated user, relying on PostgreSQL's Row-Level Security (RLS) policies defined in the database schema to ensure users can only access their own data.

## 4. Validation and Business Logic

### Validation

- **PRD Creation (`POST /api/prds`)**:
  - All initial fields (`name`, `mainProblem`, etc.) are required and cannot be empty.
  - The `name` must be unique per `user_id`, as enforced by the `UNIQUE(user_id, name)` database constraint.
- **Answering a Question (`POST /api/prds/{id}/questions`)**:
  - The `answer` field cannot be empty.

### Business Logic

- **State Machine**: The PRD lifecycle is managed by the `status` field in the `prds` table (`planning` -> `planning_review` -> `prd_review` -> `completed`). API endpoints enforce valid state transitions. For example, you cannot generate a final document if the status is not `planning_review`.
- **AI Integration**: Specific endpoints are responsible for calling the OpenRouter.ai service to generate content. They will handle the logic of preparing the correct prompts based on the PRD's data. These endpoints are:
  - `POST /api/prds/{id}/questions/generate` (for generating planning questions for each round)
  - `POST /api/prds/{id}/summary` (for generating the session summary)
  - `POST /api/prds/{id}/document` (for generating the final PRD document)
- **Error Handling**: If an AI generation step fails, the API will return a `500 Internal Server Error` with a specific error message, allowing the frontend to display a "retry" option as required by the PRD (F-012).
- **Idempotency**: `GET`, `PATCH`, `DELETE` operations are idempotent. `POST` operations that create new resources or trigger state changes are not idempotent.
