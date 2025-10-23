# OpenRouter Service Implementation Guide

## 1. Service Description

The `OpenRouterService` is designed to be a robust, reusable, and type-safe client for interacting with the OpenRouter.ai API. It will encapsulate all the logic required for making chat completion requests, including handling API keys, constructing complex requests with structured data schemas, and parsing responses. The service will be implemented as a TypeScript class, following the singleton pattern to ensure a single instance is used throughout the application, preventing unnecessary instantiations and managing the API client efficiently.

This service is a backend component intended to be used within Astro API routes (`src/pages/api/**`) or server-side logic.

## 2. Constructor Description

The constructor will be private to enforce the singleton pattern. The service will be accessed via a static `getInstance()` method. The constructor will initialize the service by:

1.  Loading the OpenRouter API key and other configuration (e.g., default model) from environment variables.
2.  Creating an instance of an HTTP client (e.g., `axios` or a wrapper around `fetch`).
3.  Throwing a runtime error if the API key is not found in the environment variables, ensuring a fail-fast approach during application startup.

```typescript
// src/lib/services/OpenRouterService.ts

class OpenRouterService {
  private static instance: OpenRouterService;
  private readonly apiKey: string;
  private readonly defaultModel: string;

  private constructor() {
    this.apiKey = import.meta.env.OPENROUTER_API_KEY;
    this.defaultModel = import.meta.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet';

    if (!this.apiKey) {
      // Use console.error for logging in server-side environments
      console.error('FATAL: OPENROUTER_API_KEY is not defined in environment variables.');
      throw new Error('OpenRouterService initialization failed: API key is missing.');
    }
  }

  public static getInstance(): OpenRouterService {
    if (!OpenRouterService.instance) {
      OpenRouterService.instance = new OpenRouterService();
    }
    return OpenRouterService.instance;
  }
}
```

## 3. Public Methods and Fields

The service will expose a primary public method for making chat completion requests.

### `public async getStructuredResponse<T>(options: StructuredResponseOptions): Promise<T>`

This is the main method for interacting with the API when a structured JSON response is expected. It abstracts the complexity of building the request and parsing the response.

-   **`options`**: An object with the following properties:
    -   `systemPrompt` (string): The system message to guide the model's behavior.
    -   `userPrompt` (string): The user's input.
    -   `jsonSchema` (object): A JSON Schema object defining the expected output structure.
    -   `model` (optional string): The model to use, overriding the default.
    -   `params` (optional object): Additional model parameters like `temperature`, `max_tokens`.
-   **Returns**: A promise that resolves to a strongly-typed object (`T`) matching the provided `jsonSchema`.

```typescript
// Example usage in an Astro API route
import type { APIRoute } from 'astro';
import { OpenRouterService, type JsonSchema } from '@/lib/services/OpenRouterService';

const prdSchema: JsonSchema = {
  name: 'prd_schema',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      featureName: { type: 'string' },
      userStories: { type: 'array', items: { type: 'string' } }
    },
    required: ['featureName', 'userStories']
  }
};

interface PrdOutput {
  featureName: string;
  userStories: string[];
}

export const POST: APIRoute = async ({ request }) => {
  const { prompt } = await request.json();
  const service = OpenRouterService.getInstance();

  try {
    const result = await service.getStructuredResponse<PrdOutput>({
      systemPrompt: 'You are an expert product manager. Generate a PRD based on the user request.',
      userPrompt: prompt,
      jsonSchema: prdSchema,
    });

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Failed to get structured response.' }), { status: 500 });
  }
};
```

## 4. Private Methods and Fields

The class will use private methods to encapsulate internal logic, promoting clean code and separation of concerns.

-   **`private async makeApiRequest(payload: object): Promise<ApiResponse>`**: A generic method to handle the actual HTTP POST request to the OpenRouter API. It will be responsible for setting headers (including the `Authorization` bearer token) and sending the payload. It will also handle basic network error checking.
-   **`private buildPayload(options: StructuredResponseOptions): ApiPayload`**: A helper method that takes the options from the public method and constructs the full request body object according to the OpenRouter API specification. This is where the `response_format` object will be correctly assembled using the provided `jsonSchema`.
-   **`private parseResponse<T>(response: ApiResponse, schema: JsonSchema): T`**: A method to parse the API response. It will check for errors in the response body, extract the message content from the `choices` array, and perform a `JSON.parse` on the content string to convert it into a JavaScript object. It should validate the parsed object against the provided schema for runtime safety.

## 5. Error Handling

Error handling will be implemented at multiple levels to ensure robustness, following the project's coding practices.

1.  **Initialization Failure**: The constructor will throw an error if the API key is missing, preventing the service from being used in an invalid state.
2.  **Network Errors**: The `makeApiRequest` method will use a `try...catch` block to handle network failures (e.g., DNS issues, timeouts) and throw a custom `NetworkError`.
3.  **API Errors**: The service will inspect the HTTP status code of the response. For non-2xx responses, it will parse the error body from OpenRouter and throw a custom `ApiError` containing the status code and error message.
4.  **Response Parsing Errors**: The `parseResponse` method will wrap `JSON.parse` in a `try...catch` block to handle cases where the model returns malformed JSON, throwing a `ParsingError`. It will also validate the parsed object against the schema and throw a `ValidationError` if it doesn't match.
5.  **Rate Limiting**: The service should specifically handle `429 Too Many Requests` status codes. A simple retry mechanism with exponential backoff will be implemented in the `makeApiRequest` method for transient errors like rate limiting or server-side issues (5xx status codes).

## 6. Security Considerations

1.  **API Key Management**: The `OPENROUTER_API_KEY` will be stored exclusively in environment variables and must not be hardcoded in the source code. The `.env` file containing the key must be added to `.gitignore`.
2.  **Input Sanitization**: Although the prompts are sent to a trusted third-party API, all user-provided input that is used to construct prompts should be treated as untrusted. While the risk is low for this specific service, it's a good practice to be aware of prompt injection risks.
3.  **Preventing Key Exposure**: The service is designed to run on the server side (in Astro's backend context). The API key must never be exposed to the client-side code. All interactions with the `OpenRouterService` must happen through controlled API endpoints.
4.  **Dependency Security**: Regularly audit and update dependencies (e.g., the HTTP client) to patch potential security vulnerabilities.

## 7. Step-by-step Implementation Plan

1.  **Environment Setup**:
    -   Create a `.env` file in the project root.
    -   Add `OPENROUTER_API_KEY="your-api-key-here"` and an optional `OPENROUTER_DEFAULT_MODEL` to the `.env` file.
    -   Ensure `.env` is listed in your `.gitignore` file.

2.  **Service Scaffolding**:
    -   Create a new file at `src/lib/services/OpenRouterService.ts`.
    -   Define the `OpenRouterService` class with the private constructor and the static `getInstance` method to implement the singleton pattern.
    -   Implement the constructor logic to load environment variables and throw an error if the API key is missing.

3.  **Type Definitions**:
    -   Inside the service file, define TypeScript interfaces or types for the service's public method options (`StructuredResponseOptions`), the JSON schema structure (`JsonSchema`), and the expected OpenRouter API request and response payloads (`ApiPayload`, `ApiResponse`). This will ensure type safety throughout the service.

4.  **Implement Public Method**:
    -   Create the `public async getStructuredResponse` method signature.
    -   Inside this method, call the (yet to be implemented) private helper methods to build the payload, make the request, and parse the response.
    -   Return the parsed and validated result.

5.  **Implement Private Methods**:
    -   **`buildPayload`**: Write the logic to transform the `systemPrompt`, `userPrompt`, and `jsonSchema` into the exact object structure required by the OpenRouter `/chat/completions` endpoint. Pay close attention to the `response_format` object.
    -   **`makeApiRequest`**: Use `fetch` (available globally in Astro's server environment) to make the POST request. Set the `Authorization: Bearer ${this.apiKey}` and `Content-Type: application/json` headers. Implement the retry logic for 429 and 5xx status codes.
    -   **`parseResponse`**: Implement the logic to safely extract and parse the JSON content from the API response. Add validation against the schema here, possibly using a lightweight validator or by checking required properties.
