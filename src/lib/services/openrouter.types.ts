/**
 * Type definitions for OpenRouter Service
 */

// ============================================================================
// JSON Schema & Request Options
// ============================================================================

/**
 * JSON Schema definition for structured responses
 */
export interface JsonSchema {
  name: string;
  strict: boolean;
  schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Options for getStructuredResponse method
 */
export interface StructuredResponseOptions {
  /** System message to guide the model's behavior */
  systemPrompt: string;
  /** User's input prompt */
  userPrompt: string;
  /** JSON Schema object defining the expected output structure */
  jsonSchema: JsonSchema;
  /** Optional model override (defaults to service default model) */
  model?: string;
  /** Additional model parameters */
  params?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
}

// ============================================================================
// OpenRouter API Types
// ============================================================================

/**
 * OpenRouter API request payload structure
 */
export interface ApiPayload {
  model: string;
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
  response_format?: {
    type: "json_schema";
    json_schema: JsonSchema;
  };
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/**
 * OpenRouter API response structure
 */
export interface ApiResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Custom error for network-related failures
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Custom error for API-related failures
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorType?: string,
    public readonly errorCode?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Custom error for response parsing failures
 */
export class ParsingError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ParsingError";
  }
}

/**
 * Custom error for schema validation failures
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
