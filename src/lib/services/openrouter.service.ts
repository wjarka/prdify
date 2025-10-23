/**
 * OpenRouterService
 *
 * A robust, reusable, and type-safe client for interacting with the OpenRouter.ai API.
 * Implements singleton pattern to ensure a single instance throughout the application.
 *
 * @example
 * ```typescript
 * const service = OpenRouterService.getInstance();
 * const result = await service.getStructuredResponse<MyType>({
 *   systemPrompt: 'You are a helpful assistant',
 *   userPrompt: 'Generate a response',
 *   jsonSchema: mySchema,
 * });
 * ```
 */

import type { JsonSchema, StructuredResponseOptions, ApiPayload, ApiResponse } from "./openrouter.types";
import { NetworkError, ApiError, ParsingError, ValidationError } from "./openrouter.types";

export {
  NetworkError,
  ApiError,
  ParsingError,
  ValidationError,
  type JsonSchema,
  type StructuredResponseOptions,
} from "./openrouter.types";

// ============================================================================
// OpenRouterService Class
// ============================================================================

export class OpenRouterService {
  private static instance: OpenRouterService;
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly baseUrl = "https://openrouter.ai/api/v1";

  // Retry configuration
  private readonly maxRetries = 3;
  private readonly baseDelayMs = 1000;

  /**
   * Private constructor to enforce singleton pattern
   * Initializes the service with API key and configuration from environment variables
   * @throws {Error} If OPENROUTER_API_KEY is not defined in environment variables
   */
  private constructor() {
    this.apiKey = import.meta.env.OPENROUTER_API_KEY;
    this.defaultModel = import.meta.env.OPENROUTER_DEFAULT_MODEL || "anthropic/claude-3.5-sonnet";

    if (!this.apiKey) {
      throw new Error(
        "OpenRouterService initialization failed: OPENROUTER_API_KEY is not defined in environment variables."
      );
    }
  }

  /**
   * Gets the singleton instance of OpenRouterService
   * @returns {OpenRouterService} The singleton instance
   */
  public static getInstance(): OpenRouterService {
    if (!OpenRouterService.instance) {
      OpenRouterService.instance = new OpenRouterService();
    }
    return OpenRouterService.instance;
  }

  /**
   * Main public method for making structured chat completion requests
   *
   * @template T The expected return type matching the provided JSON schema
   * @param {StructuredResponseOptions} options Configuration for the request
   * @returns {Promise<T>} Strongly-typed response matching the JSON schema
   * @throws {NetworkError} If network-related issues occur
   * @throws {ApiError} If the API returns an error response
   * @throws {ParsingError} If response parsing fails
   * @throws {ValidationError} If response doesn't match the schema
   */
  public async getStructuredResponse<T>(options: StructuredResponseOptions): Promise<T> {
    const payload = this.buildPayload(options);
    const response = await this.makeApiRequest(payload);
    const result = this.parseResponse<T>(response, options.jsonSchema);
    return result;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Builds the API request payload from the provided options
   *
   * @param {StructuredResponseOptions} options Request options
   * @returns {ApiPayload} Formatted payload for OpenRouter API
   */
  private buildPayload(options: StructuredResponseOptions): ApiPayload {
    const payload: ApiPayload = {
      model: options.model || this.defaultModel,
      messages: [
        {
          role: "system",
          content: options.systemPrompt,
        },
        {
          role: "user",
          content: options.userPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: options.jsonSchema,
      },
    };

    // Add optional parameters if provided
    if (options.params) {
      if (options.params.temperature !== undefined) {
        payload.temperature = options.params.temperature;
      }
      if (options.params.max_tokens !== undefined) {
        payload.max_tokens = options.params.max_tokens;
      }
      if (options.params.top_p !== undefined) {
        payload.top_p = options.params.top_p;
      }
      if (options.params.frequency_penalty !== undefined) {
        payload.frequency_penalty = options.params.frequency_penalty;
      }
      if (options.params.presence_penalty !== undefined) {
        payload.presence_penalty = options.params.presence_penalty;
      }
    }

    return payload;
  }

  /**
   * Makes the actual HTTP request to OpenRouter API with retry logic
   *
   * @param {ApiPayload} payload Request payload
   * @returns {Promise<ApiResponse>} API response
   * @throws {NetworkError} If network-related issues occur
   * @throws {ApiError} If the API returns an error response
   */
  private async makeApiRequest(payload: ApiPayload): Promise<ApiResponse> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": import.meta.env.SITE || "https://prdify.com",
            "X-Title": "PRDify",
          },
          body: JSON.stringify(payload),
        });

        // Handle non-2xx responses
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
          const errorMessage = errorBody.error?.message || `HTTP ${response.status}: ${response.statusText}`;

          // Retry on rate limiting (429) or server errors (5xx)
          if (response.status === 429 || response.status >= 500) {
            if (attempt < this.maxRetries - 1) {
              const delay = this.baseDelayMs * Math.pow(2, attempt);
              await this.sleep(delay);
              continue;
            }
          }

          throw new ApiError(errorMessage, response.status, errorBody.error?.type, errorBody.error?.code);
        }

        const data: ApiResponse = await response.json();

        // Check for error in response body
        if (data.error) {
          throw new ApiError(data.error.message, 500, data.error.type, data.error.code);
        }

        return data;
      } catch (error) {
        lastError = error as Error;

        // Don't retry ApiErrors (except 429 and 5xx which are handled above)
        if (error instanceof ApiError) {
          throw error;
        }

        // Retry network errors
        if (attempt < this.maxRetries - 1) {
          const delay = this.baseDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }

        throw new NetworkError(
          `Failed to make API request after ${this.maxRetries} attempts: ${(error as Error).message}`,
          error
        );
      }
    }

    throw new NetworkError(`Failed to make API request after ${this.maxRetries} attempts`, lastError);
  }

  /**
   * Parses and validates the API response
   *
   * @template T The expected return type
   * @param {ApiResponse} response API response to parse
   * @param {JsonSchema} schema JSON schema for validation
   * @returns {T} Parsed and validated response object
   * @throws {ParsingError} If JSON parsing fails
   * @throws {ValidationError} If response doesn't match schema
   */
  private parseResponse<T>(response: ApiResponse, schema: JsonSchema): T {
    // Validate response structure
    if (!response.choices || response.choices.length === 0) {
      throw new ParsingError("Invalid API response: no choices returned");
    }

    const choice = response.choices[0];
    if (!choice.message || !choice.message.content) {
      throw new ParsingError("Invalid API response: no message content");
    }

    // Parse JSON content
    let parsedContent: T;
    try {
      parsedContent = JSON.parse(choice.message.content) as T;
    } catch (error) {
      throw new ParsingError(`Failed to parse response JSON: ${(error as Error).message}`, error);
    }

    // Validate against schema
    this.validateAgainstSchema(parsedContent, schema);

    return parsedContent;
  }

  /**
   * Validates an object against a JSON schema
   *
   * @param {unknown} data Data to validate
   * @param {JsonSchema} schema Schema to validate against
   * @throws {ValidationError} If validation fails
   */
  private validateAgainstSchema(data: unknown, schema: JsonSchema): void {
    if (typeof data !== "object" || data === null) {
      throw new ValidationError("Response is not an object");
    }

    const obj = data as Record<string, unknown>;
    const required = schema.schema.required || [];

    // Check required properties
    for (const prop of required) {
      if (!(prop in obj)) {
        throw new ValidationError(`Missing required property: ${prop}`, {
          expected: required,
          received: Object.keys(obj),
        });
      }
    }

    // Basic type checking for properties (simplified validation)
    for (const key of Object.keys(obj)) {
      if (!(key in schema.schema.properties)) {
        if (schema.schema.additionalProperties === false) {
          throw new ValidationError(`Unexpected property: ${key}`, {
            allowedProperties: Object.keys(schema.schema.properties),
          });
        }
      }
    }
  }

  /**
   * Helper method for async sleep (used in retry logic)
   *
   * @param {number} ms Milliseconds to sleep
   * @returns {Promise<void>}
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
