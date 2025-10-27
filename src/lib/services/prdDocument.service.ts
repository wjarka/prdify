import type { SupabaseClient } from "../../db/supabase.client";
import type { Tables } from "../../db/database.types";
import { getPrdById } from "./prds";
import { OpenRouterService, type JsonSchema } from "./openrouter.service";

/**
 * Custom error classes for PRD document operations
 */
export class PrdDocumentGenerationError extends Error {
  constructor(message = "Unable to generate PRD document") {
    super(message);
    this.name = "PrdDocumentGenerationError";
  }
}

export class PrdDocumentConflictError extends Error {
  constructor(message = "PRD status conflict for document operation") {
    super(message);
    this.name = "PrdDocumentConflictError";
  }
}

export class PrdDocumentUpdateError extends Error {
  constructor(message = "Unable to update PRD document") {
    super(message);
    this.name = "PrdDocumentUpdateError";
  }
}

/**
 * Updates the document content for a PRD in the database.
 * This is a shared helper function used by both generatePrdDocument and updatePrdDocument.
 *
 * @param supabase - The Supabase client instance
 * @param prdId - The unique identifier of the PRD
 * @param content - The new document content
 * @param additionalUpdates - Optional additional fields to update
 * @throws PrdDocumentUpdateError if database update fails
 */
async function updatePrdDocumentContent(
  supabase: SupabaseClient,
  prdId: string,
  content: string,
  additionalUpdates: Partial<Pick<Tables<"prds">, "status">> = {}
): Promise<void> {
  const { error } = await supabase
    .from("prds")
    .update({
      content,
      ...additionalUpdates,
    })
    .eq("id", prdId);

  if (error) {
    throw new PrdDocumentUpdateError(`Failed to update PRD document: ${error.message}`);
  }
}

/**
 * Generates the final PRD document content based on the approved summary.
 * Transitions the PRD status from 'planning_review' to 'prd_review'.
 *
 * @param supabase - The Supabase client instance
 * @param prdId - The unique identifier of the PRD
 * @returns Promise resolving to the generated document content string
 * @throws PrdNotFoundError if PRD doesn't exist
 * @throws PrdDocumentConflictError if PRD is not in planning_review status or has no summary
 * @throws PrdDocumentGenerationError if AI service fails or database update fails
 */
export async function generatePrdDocument(supabase: SupabaseClient, prdId: string): Promise<string> {
  // Fetch the PRD and validate its status
  const prd = await getPrdById(supabase, prdId);

  if (prd.status !== "planning_review") {
    throw new PrdDocumentConflictError("PRD must be in planning_review status to generate document");
  }

  if (!prd.summary) {
    throw new PrdDocumentConflictError("Cannot generate document: PRD has no summary");
  }

  // Generate document using OpenRouter AI service
  const content = await generateDocumentWithAI(
    prd.name,
    prd.mainProblem,
    prd.inScope,
    prd.outOfScope,
    prd.successCriteria,
    prd.summary
  );

  // Update the PRD record with the document content and change status
  await updatePrdDocumentContent(supabase, prdId, content, { status: "prd_review" });

  return content;
}

/**
 * Updates the content of a generated PRD document. Only allowed when the PRD is in 'prd_review' status.
 *
 * @param supabase - The Supabase client instance
 * @param prdId - The unique identifier of the PRD
 * @param content - The new document content
 * @returns Promise resolving to the updated content string
 * @throws PrdNotFoundError if PRD doesn't exist
 * @throws PrdDocumentConflictError if PRD is not in prd_review status
 * @throws PrdDocumentUpdateError if database update fails
 */
export async function updatePrdDocument(supabase: SupabaseClient, prdId: string, content: string): Promise<string> {
  // Fetch the PRD and validate its status
  const prd = await getPrdById(supabase, prdId);

  if (prd.status !== "prd_review") {
    throw new PrdDocumentConflictError("PRD must be in prd_review status to update document");
  }

  // Update the document content in the database
  await updatePrdDocumentContent(supabase, prdId, content);

  return content;
}

/**
 * JSON Schema for PRD document generation response
 */
const PRD_DOCUMENT_SCHEMA: JsonSchema = {
  name: "prd_document_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      document: {
        type: "string",
        description: "The complete PRD document in markdown format",
      },
    },
    required: ["document"],
    additionalProperties: false,
  },
};

/**
 * Response type for PRD document generation
 */
interface PrdDocumentResponse {
  document: string;
}

/**
 * Generates a comprehensive PRD document using OpenRouter AI service
 *
 * @param appName - The name of the application/product
 * @param mainProblem - The main problem the product solves
 * @param inScope - Features and functionality that are in scope
 * @param outOfScope - Features and functionality that are out of scope
 * @param successCriteria - Success criteria for the product
 * @param summary - The comprehensive planning session summary
 * @returns Promise resolving to the generated PRD document in markdown format
 * @throws PrdDocumentGenerationError if AI service fails
 */
async function generateDocumentWithAI(
  appName: string,
  mainProblem: string,
  inScope: string,
  outOfScope: string,
  successCriteria: string,
  summary: string
): Promise<string> {
  try {
    const openRouter = OpenRouterService.getInstance();

    // Build the project description from initial form fields
    const projectDescription = `
Application Name: ${appName}

Main Problem:
${mainProblem}

In Scope:
${inScope}

Out of Scope:
${outOfScope}

Success Criteria:
${successCriteria}
    `.trim();

    // Build the system prompt
    const systemPrompt = `You are an experienced product manager whose task is to create a comprehensive Product Requirements Document (PRD) based on the provided project description and planning session summary.

Follow these steps to create a comprehensive and well-organized document:

1. Divide the PRD into the following sections:
   a. Project Overview
   b. User Problem
   c. Functional Requirements
   d. Project Boundaries
   e. User Stories
   f. Success Metrics

2. In each section, provide detailed and relevant information based on the project description and planning session summary. Make sure to:
   - Use clear and concise language
   - Provide specific details and data as needed
   - Maintain consistency throughout the document
   - Address all points listed in each section

3. When creating user stories and acceptance criteria:
   - List ALL necessary user stories, including basic, alternative, and edge case scenarios.
   - Assign a unique requirement identifier (e.g., US-001) to each user story for direct traceability.
   - Include at least one user story specifically for secure access or authentication, if the application requires user identification or access restrictions.
   - Ensure that no potential user interaction is omitted.
   - Ensure that each user story is testable.

Use the following structure for each user story:
- ID
- Title
- Description
- Acceptance Criteria

4. After completing the PRD, review it against this checklist:
   - Is each user story testable?
   - Are the acceptance criteria clear and specific?
   - Do we have enough user stories to build a fully functional application?
   - Have we included authentication and authorization requirements (if applicable)?

5. PRD Formatting:
   - Maintain consistent formatting and numbering.
   - Do not use bold formatting in markdown ( ** ).
   - List ALL user stories.
   - Format the PRD in proper markdown.

Prepare the PRD with the following structure:

# Product Requirements Document (PRD) - ${appName}
## 1. Product Overview
## 2. User Problem
## 3. Functional Requirements
## 4. Product Boundaries
## 5. User Stories
## 6. Success Metrics

Remember to fill each section with detailed, relevant information based on the project description and planning session summary. Ensure the PRD is comprehensive, clear, and contains all relevant information needed for further product development.

The final output should consist solely of the PRD in the specified markdown format.`;

    // Build the user prompt
    const userPrompt = `
<project_description>
${projectDescription}
</project_description>

<project_details>
${summary}
</project_details>

Generate a comprehensive Product Requirements Document (PRD) following the structure and guidelines provided in the system prompt.`;

    // Call OpenRouter API
    const response = await openRouter.getStructuredResponse<PrdDocumentResponse>({
      systemPrompt,
      userPrompt,
      jsonSchema: PRD_DOCUMENT_SCHEMA,
      params: {
        temperature: 0.7,
      },
    });

    return response.document;
  } catch (error) {
    if (error instanceof Error) {
      throw new PrdDocumentGenerationError(`Failed to generate PRD document: ${error.message}`);
    }
    throw new PrdDocumentGenerationError();
  }
}
