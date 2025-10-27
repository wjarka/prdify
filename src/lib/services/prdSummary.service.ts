import type { SupabaseClient } from "../../db/supabase.client";
import type { PrdQuestionDto, PrdDto } from "../../types";
import { getPrdById } from "./prds";
import { getPrdQuestions } from "./prdQuestion.service";
import { OpenRouterService, type JsonSchema } from "./openrouter.service";

/**
 * Custom error classes for PRD summary operations
 */
export class PrdSummaryGenerationError extends Error {
  constructor(message = "Unable to generate PRD summary") {
    super(message);
    this.name = "PrdSummaryGenerationError";
  }
}

export class PrdSummaryConflictError extends Error {
  constructor(message = "PRD status conflict for summary operation") {
    super(message);
    this.name = "PrdSummaryConflictError";
  }
}

export class PrdSummaryUpdateError extends Error {
  constructor(message = "Unable to update PRD summary") {
    super(message);
    this.name = "PrdSummaryUpdateError";
  }
}

/**
 * Updates the summary text of a PRD. Only allowed when the PRD is in 'planning_review' status.
 *
 * @param supabase - The Supabase client instance
 * @param prdId - The unique identifier of the PRD
 * @param summary - The new summary text
 * @returns Promise resolving to the updated summary string
 * @throws PrdNotFoundError if PRD doesn't exist
 * @throws PrdSummaryConflictError if PRD is not in planning_review status
 * @throws PrdSummaryUpdateError if database update fails
 */
export async function updateSummary(supabase: SupabaseClient, prdId: string, summary: string): Promise<string> {
  // Fetch the PRD and validate its status
  const prd = await getPrdById(supabase, prdId);

  if (prd.status !== "planning_review") {
    throw new PrdSummaryConflictError("PRD must be in planning_review status to update summary");
  }

  // Update the summary in the database
  const { error } = await supabase
    .from("prds")
    .update({
      summary,
    })
    .eq("id", prdId);

  if (error) {
    throw new PrdSummaryUpdateError(`Failed to update PRD summary: ${error.message}`);
  }

  return summary;
}

/**
 * Deletes the summary and reverts PRD status from 'planning_review' back to 'planning'.
 * This provides an "escape hatch" for users who want to return to the question-answering phase.
 *
 * @param supabase - The Supabase client instance
 * @param prdId - The unique identifier of the PRD
 * @throws PrdNotFoundError if PRD doesn't exist
 * @throws PrdSummaryConflictError if PRD is not in planning_review status
 * @throws PrdSummaryUpdateError if database update fails
 */
export async function deleteSummary(supabase: SupabaseClient, prdId: string): Promise<void> {
  // Fetch the PRD and validate its status
  const prd = await getPrdById(supabase, prdId);

  if (prd.status !== "planning_review") {
    throw new PrdSummaryConflictError("PRD must be in planning_review status to delete summary");
  }

  // Update the PRD record to clear summary and revert status
  const { error } = await supabase
    .from("prds")
    .update({
      summary: null,
      status: "planning",
    })
    .eq("id", prdId);

  if (error) {
    throw new PrdSummaryUpdateError(`Failed to delete PRD summary: ${error.message}`);
  }
}

/**
 * Generates an AI-powered summary of the planning session for a specific PRD.
 * Transitions the PRD status from 'planning' to 'planning_review'.
 *
 * @param supabase - The Supabase client instance
 * @param prdId - The unique identifier of the PRD
 * @returns Promise resolving to the generated summary string
 * @throws PrdNotFoundError if PRD doesn't exist
 * @throws PrdSummaryConflictError if PRD is not in planning status or has no questions
 * @throws PrdSummaryGenerationError if AI service fails or database update fails
 */
export async function generateSummary(supabase: SupabaseClient, prdId: string): Promise<string> {
  // Fetch the PRD and validate its status
  const prd = await getPrdById(supabase, prdId);

  if (prd.status !== "planning") {
    throw new PrdSummaryConflictError("PRD must be in planning status to generate summary");
  }

  // Retrieve all questions and answers for the PRD
  const questionsResult = await getPrdQuestions(supabase, prdId, 1, 1000); // Large limit to get all questions
  const questions = questionsResult.questions;

  // Check if there are any questions
  if (questions.length === 0) {
    throw new PrdSummaryConflictError("Cannot generate summary: PRD has no questions");
  }

  // Check if all questions have answers
  const unansweredQuestions = questions.filter((q) => q.answer === null);
  if (unansweredQuestions.length > 0) {
    throw new PrdSummaryConflictError("Cannot generate summary: PRD has unanswered questions");
  }

  // Construct the prompt for AI service
  const prompt = constructSummaryPrompt(prd, questions);

  // Generate summary using AI service (mocked for now)
  const summary = await generateSummaryWithAI(prompt);

  // Update the PRD record with the summary and change status
  const { error } = await supabase
    .from("prds")
    .update({
      summary,
      status: "planning_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", prdId);

  if (error) {
    throw new PrdSummaryGenerationError(`Failed to update PRD with summary: ${error.message}`);
  }

  return summary;
}

/**
 * JSON Schema for AI summary response
 */
const SUMMARY_RESPONSE_SCHEMA: JsonSchema = {
  name: "prd_summary_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "The complete markdown-formatted summary including all sections",
      },
    },
    required: ["summary"],
    additionalProperties: false,
  },
};

/**
 * Constructs the planning session history for the AI prompt
 */
function constructPlanningSessionHistory(prd: PrdDto, questions: PrdQuestionDto[]): string {
  const qAndASection = questions
    .map((q, index) => `**Question ${index + 1}:** ${q.question}\n**Answer ${index + 1}:** ${q.answer}`)
    .join("\n\n");

  return `# Project Description
**Name:** ${prd.name}

# Identified User Problem
${prd.mainProblem}

# In Scope
${prd.inScope}

# Out of Scope
${prd.outOfScope}

# Success Criteria
${prd.successCriteria}

# Conversation History
${qAndASection}`;
}

/**
 * Constructs the complete user prompt with planning session history
 */
function constructSummaryPrompt(prd: PrdDto, questions: PrdQuestionDto[]): string {
  const planningSessionHistory = constructPlanningSessionHistory(prd, questions);

  return `${planningSessionHistory}

---

You are an AI assistant whose task is to summarize a conversation about PRD (Product Requirements Document) planning for MVP and prepare a concise summary for the next development stage. In the conversation history you will find the following information:
1. Project description
2. Identified user problem
3. Conversation history containing questions and answers
4. Recommendations regarding PRD content

Your task is to:
1. Summarize the conversation history, focusing on all decisions related to PRD planning.
2. Match the model's recommendations to the answers given in the conversation history. Identify which recommendations are relevant based on the discussion.
3. Prepare a detailed conversation summary that includes:
   a. Main functional requirements of the product
   b. Key user stories and usage paths
   c. Important success criteria and ways to measure them
   d. Any unresolved issues or areas requiring further clarification
4. Format the results as follows:

<conversation_summary>
<decisions>
[List decisions made by the user, numbered].
</decisions>

<matched_recommendations>
[List of the most relevant recommendations matched to the conversation, numbered]
</matched_recommendations>

<prd_planning_summary>
[Provide a detailed summary of the conversation, including the elements listed in step 3].
</prd_planning_summary>

<unresolved_issues>
[List any unresolved issues or areas requiring further clarification, if any exist]
</unresolved_issues>
</conversation_summary>

The final result should contain only content in markdown format. Ensure that your summary is clear, concise, and provides valuable information for the next stage of creating the PRD.`;
}

/**
 * Generates a summary using OpenRouter AI service
 * @throws PrdSummaryGenerationError if AI service fails
 */
async function generateSummaryWithAI(prompt: string): Promise<string> {
  try {
    const openRouterService = OpenRouterService.getInstance();

    interface SummaryResponse {
      summary: string;
    }

    const response = await openRouterService.getStructuredResponse<SummaryResponse>({
      systemPrompt:
        "You are an expert technical writer specializing in Product Requirements Documents. Your role is to analyze planning sessions and create comprehensive, well-structured summaries that help development teams understand project requirements clearly.",
      userPrompt: prompt,
      jsonSchema: SUMMARY_RESPONSE_SCHEMA,
      params: {
        temperature: 0.7,
      },
    });

    return response.summary;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new PrdSummaryGenerationError(`Failed to generate summary with AI: ${errorMessage}`);
  }
}
