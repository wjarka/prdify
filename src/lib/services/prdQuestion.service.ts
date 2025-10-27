import type { PostgrestError } from "@supabase/supabase-js";

import type { SupabaseClient } from "../../db/supabase.client";
import type {
  PrdQuestion,
  PrdQuestionDto,
  PaginatedPrdQuestionsDto,
  UpdatePrdQuestionsCommand,
  PrdQuestionRoundDto,
} from "../../types";
import { getCurrentRoundNumber } from "./prds";
import { OpenRouterService, type JsonSchema } from "./openrouter.service";
import { NetworkError, ApiError, ParsingError, ValidationError } from "./openrouter.types";

const POSTGREST_NOT_FOUND_CODE = "PGRST116";

/**
 * Options for filtering PRD questions
 */
interface GetPrdQuestionsOptions {
  roundNumber?: number;
}

/**
 * Type definition for a single question with recommendation from the AI
 */
interface QuestionWithRecommendation {
  question: string;
  recommendation: string;
}

/**
 * Type definition for the AI response containing questions
 */
interface AiQuestionsResponse {
  questions: QuestionWithRecommendation[];
}

export class PrdQuestionFetchingError extends Error {
  constructor(message = "Unable to fetch PRD questions") {
    super(message);
    this.name = "PrdQuestionFetchingError";
  }
}

export class PrdQuestionUpdateError extends Error {
  constructor(message = "Unable to update PRD questions") {
    super(message);
    this.name = "PrdQuestionUpdateError";
  }
}

export class PrdQuestionNotFoundError extends Error {
  constructor(message = "PRD question not found") {
    super(message);
    this.name = "PrdQuestionNotFoundError";
  }
}

export class PrdQuestionConflictError extends Error {
  constructor(message = "Cannot update questions for a non-planning PRD") {
    super(message);
    this.name = "PrdQuestionConflictError";
  }
}

export class PrdNotFoundError extends Error {
  constructor(message = "PRD not found") {
    super(message);
    this.name = "PrdNotFoundError";
  }
}

export class PrdQuestionGenerationError extends Error {
  constructor(message = "Cannot generate questions for a non-planning PRD") {
    super(message);
    this.name = "PrdQuestionGenerationError";
  }
}

export class PrdQuestionAiGenerationError extends Error {
  constructor(message = "Failed to generate questions using AI service") {
    super(message);
    this.name = "PrdQuestionAiGenerationError";
  }
}

/**
 * Maps a PrdQuestion database row to a PrdQuestionDto
 */
function mapPrdQuestionRowToDto(row: PrdQuestion): PrdQuestionDto {
  return {
    id: row.id,
    prdId: row.prd_id,
    roundNumber: row.round_number,
    question: row.question,
    answer: row.answer,
    createdAt: row.created_at,
  };
}

/**
 * Handles PostgrestError for PRD question operations
 */
function handlePrdQuestionPostgrestError(error: PostgrestError): never {
  throw new PrdQuestionFetchingError(error.message);
}

/**
 * Handles PostgrestError for PRD question update operations
 */
function handlePrdQuestionUpdatePostgrestError(error: PostgrestError): never {
  throw new PrdQuestionUpdateError(error.message);
}

/**
 * Defines the JSON schema for AI-generated questions
 */
function getQuestionsJsonSchema(): JsonSchema {
  return {
    name: "prd_questions",
    strict: true,
    schema: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "The question to ask about the PRD",
              },
              recommendation: {
                type: "string",
                description: "A recommendation or suggestion related to the question",
              },
            },
            required: ["question", "recommendation"],
            additionalProperties: false,
          },
          minItems: 5,
          maxItems: 10,
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
  };
}

/**
 * Builds the system prompt for question generation
 */
function buildSystemPrompt(): string {
  return `You are an experienced product manager whose task is to help create a comprehensive Product Requirements Document (PRD) based on the provided information. Your goal is to generate a list of questions and recommendations that will be used in subsequent prompting to create a complete PRD.

Consider the following aspects in your analysis:
1. Identify the main problem that the product is intended to solve.
2. Define the key functionalities of the MVP.
3. Consider potential user stories and paths of product usage.
4. Think about success criteria and how to measure them.
5. Assess design constraints and their impact on product development.

Based on your analysis, generate a list of 5-10 questions and recommendations in a combined form (question + recommendation). These should address any ambiguities, potential issues, or areas where more information is needed to create an effective PRD. Consider questions about:

1. Details of the user's problem
2. Prioritization of functionality
3. Expected user experience
4. Measurable success indicators
5. Potential risks and challenges
6. Schedule and resources

Remember to focus on clarity, relevance, and accuracy of results. Do not include any additional comments or explanations beyond the specified output format.`;
}

/**
 * Builds the user prompt with PRD information and previous Q&A context
 */
function buildUserPrompt(
  mainProblem: string,
  inScope: string,
  outOfScope: string,
  successCriteria: string,
  previousQuestionsAndAnswers?: PrdQuestionDto[]
): string {
  let prompt = `Please carefully review the following information:

<project_description>
Main Problem: ${mainProblem}

In Scope: ${inScope}

Out of Scope: ${outOfScope}

Success Criteria: ${successCriteria}
</project_description>`;

  // Add previous Q&A context if available
  if (previousQuestionsAndAnswers && previousQuestionsAndAnswers.length > 0) {
    prompt += `\n\n<previous_rounds>
The following questions have already been asked and answered in previous rounds:

`;
    for (const qa of previousQuestionsAndAnswers) {
      prompt += `Q: ${qa.question}\nA: ${qa.answer || "(Not answered yet)"}\n\n`;
    }
    prompt += `</previous_rounds>

Based on the project description and the previous questions and answers, generate new questions that:
1. Build upon the information already gathered
2. Explore areas not yet covered
3. Help clarify any remaining ambiguities
4. Do NOT repeat questions that have already been asked`;
  } else {
    prompt += `\n\nThis is the first round of questions. Generate initial questions to help understand the project better and gather essential information for creating a comprehensive PRD.`;
  }

  prompt += `\n\nGenerate your questions and recommendations now.`;

  return prompt;
}

/**
 * Retrieves paginated PRD questions for a specific PRD
 * Includes authorization check to ensure user owns the PRD
 * @param options Optional filtering options (e.g., roundNumber)
 */
export async function getPrdQuestions(
  supabase: SupabaseClient,
  prdId: string,
  page: number,
  limit: number,
  options?: GetPrdQuestionsOptions
): Promise<PaginatedPrdQuestionsDto> {
  // First verify the PRD exists and get basic info (RLS will handle authorization)
  const { data: prdData, error: prdError } = await supabase.from("prds").select("id").eq("id", prdId).single();

  if (prdError) {
    if (prdError.code === POSTGREST_NOT_FOUND_CODE) {
      throw new PrdNotFoundError();
    }
    throw new PrdQuestionFetchingError(prdError.message);
  }

  if (!prdData) {
    throw new PrdNotFoundError();
  }

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  try {
    // Build base query for counting
    let countQuery = supabase.from("prd_questions").select("*", { count: "exact", head: true }).eq("prd_id", prdId);

    // Build base query for fetching questions
    let questionsQuery = supabase.from("prd_questions").select("*").eq("prd_id", prdId);

    // Apply round number filter if specified
    if (options?.roundNumber !== undefined) {
      countQuery = countQuery.eq("round_number", options.roundNumber);
      questionsQuery = questionsQuery.eq("round_number", options.roundNumber);
    }

    // Get total count of questions for the PRD
    const { count, error: countError } = await countQuery;

    if (countError) {
      handlePrdQuestionPostgrestError(countError);
    }

    // Get paginated questions
    const { data: questionsData, error: questionsError } = await questionsQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (questionsError) {
      handlePrdQuestionPostgrestError(questionsError);
    }

    const totalItems = count ?? 0;
    const totalPages = Math.ceil(totalItems / limit);

    const questions = questionsData?.map(mapPrdQuestionRowToDto) ?? [];

    return {
      questions,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  } catch (error) {
    if (error instanceof PrdNotFoundError || error instanceof PrdQuestionFetchingError) {
      throw error;
    }
    throw new PrdQuestionFetchingError(error instanceof Error ? error.message : "An unknown error occurred");
  }
}

/**
 * Submits answers to PRD questions
 * Only allowed when PRD is in planning status
 */
export async function submitAnswers(
  supabase: SupabaseClient,
  prdId: string,
  command: UpdatePrdQuestionsCommand
): Promise<void> {
  // First verify the PRD exists and is in planning status
  const { data: prdData, error: prdError } = await supabase.from("prds").select("id, status").eq("id", prdId).single();

  if (prdError) {
    if (prdError.code === POSTGREST_NOT_FOUND_CODE) {
      throw new PrdNotFoundError();
    }
    throw new PrdQuestionUpdateError(prdError.message);
  }

  if (!prdData) {
    throw new PrdNotFoundError();
  }

  if (prdData.status !== "planning") {
    throw new PrdQuestionConflictError();
  }

  try {
    // Verify all question IDs exist and belong to the PRD
    const questionIds = command.answers.map((answer) => answer.questionId);
    const { data: existingQuestions, error: questionsError } = await supabase
      .from("prd_questions")
      .select("id")
      .eq("prd_id", prdId)
      .in("id", questionIds);

    if (questionsError) {
      handlePrdQuestionUpdatePostgrestError(questionsError);
    }

    const existingQuestionIds = new Set(existingQuestions?.map((q) => q.id) ?? []);
    const invalidQuestionIds = questionIds.filter((id) => !existingQuestionIds.has(id));

    if (invalidQuestionIds.length > 0) {
      throw new PrdQuestionNotFoundError(
        `Questions not found or do not belong to this PRD: ${invalidQuestionIds.join(", ")}`
      );
    }

    // Update answers sequentially
    // Note: Using sequential updates for simplicity and atomicity per update
    for (const answer of command.answers) {
      const { error: updateError } = await supabase
        .from("prd_questions")
        .update({ answer: answer.text })
        .eq("id", answer.questionId)
        .eq("prd_id", prdId); // Extra safety check

      if (updateError) {
        handlePrdQuestionUpdatePostgrestError(updateError);
      }
    }
  } catch (error) {
    if (
      error instanceof PrdNotFoundError ||
      error instanceof PrdQuestionConflictError ||
      error instanceof PrdQuestionNotFoundError ||
      error instanceof PrdQuestionUpdateError
    ) {
      throw error;
    }
    throw new PrdQuestionUpdateError(error instanceof Error ? error.message : "An unknown error occurred");
  }
}

/**
 * Generates the next round of questions for a PRD using AI service
 * Only allowed when PRD is in planning status
 */
export async function generateNextQuestions(supabase: SupabaseClient, prdId: string): Promise<PrdQuestionDto[]> {
  // First verify the PRD exists and is in planning status
  const { data: prdData, error: prdError } = await supabase
    .from("prds")
    .select("id, status, main_problem, in_scope, out_of_scope, success_criteria")
    .eq("id", prdId)
    .single();

  if (prdError) {
    if (prdError.code === POSTGREST_NOT_FOUND_CODE) {
      throw new PrdNotFoundError();
    }
    throw new PrdQuestionFetchingError(prdError.message);
  }

  if (!prdData) {
    throw new PrdNotFoundError();
  }

  if (prdData.status !== "planning") {
    throw new PrdQuestionGenerationError();
  }

  // Calculate the next round number
  const currentRoundNumber = await getCurrentRoundNumber(supabase, prdId);
  const nextRoundNumber = currentRoundNumber + 1;

  try {
    // Get all previous questions and answers for context
    const { data: previousQuestions, error: previousQuestionsError } = await supabase
      .from("prd_questions")
      .select("*")
      .eq("prd_id", prdId)
      .order("round_number", { ascending: true })
      .order("created_at", { ascending: true });

    if (previousQuestionsError) {
      throw new PrdQuestionFetchingError(previousQuestionsError.message);
    }

    const previousQuestionsDto = previousQuestions?.map(mapPrdQuestionRowToDto) ?? [];

    // Build prompts for AI service
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(
      prdData.main_problem,
      prdData.in_scope,
      prdData.out_of_scope,
      prdData.success_criteria,
      previousQuestionsDto
    );

    // Call OpenRouter service to generate questions
    const openRouterService = OpenRouterService.getInstance();
    const aiResponse = await openRouterService.getStructuredResponse<AiQuestionsResponse>({
      systemPrompt,
      userPrompt,
      jsonSchema: getQuestionsJsonSchema(),
      params: {
        temperature: 0.7,
        max_tokens: 4000,
      },
    });

    // Transform AI response to questions with combined question + recommendation format
    const questionsToInsert = aiResponse.questions.map((item) => ({
      prd_id: prdId,
      question: `${item.question}\n\nRecommendation: ${item.recommendation}`,
      round_number: nextRoundNumber,
      answer: null,
    }));

    // Insert new questions into database
    const { data: insertedQuestions, error: insertError } = await supabase
      .from("prd_questions")
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      throw new PrdQuestionFetchingError(insertError.message);
    }

    if (!insertedQuestions) {
      throw new PrdQuestionFetchingError("Failed to insert questions");
    }

    return insertedQuestions.map(mapPrdQuestionRowToDto);
  } catch (error) {
    // Handle OpenRouter-specific errors
    if (
      error instanceof NetworkError ||
      error instanceof ApiError ||
      error instanceof ParsingError ||
      error instanceof ValidationError
    ) {
      throw new PrdQuestionAiGenerationError(`AI service error: ${error.message}`);
    }

    // Re-throw known errors
    if (
      error instanceof PrdNotFoundError ||
      error instanceof PrdQuestionGenerationError ||
      error instanceof PrdQuestionFetchingError ||
      error instanceof PrdQuestionAiGenerationError
    ) {
      throw error;
    }

    // Handle unknown errors
    throw new PrdQuestionAiGenerationError(error instanceof Error ? error.message : "An unknown error occurred");
  }
}

/**
 * Retrieves the latest round of PRD questions for a specific PRD
 * Calculates the latest round number and uses getPrdQuestions to fetch all questions from that round
 * @param supabase Supabase client instance
 * @param prdId PRD identifier
 * @returns DTO containing questions from the latest round
 */
export async function getLatestPrdQuestionRound(supabase: SupabaseClient, prdId: string): Promise<PrdQuestionRoundDto> {
  // First verify the PRD exists (RLS will handle authorization)
  const { data: prdData, error: prdError } = await supabase.from("prds").select("id").eq("id", prdId).single();

  if (prdError) {
    if (prdError.code === POSTGREST_NOT_FOUND_CODE) {
      throw new PrdNotFoundError();
    }
    throw new PrdQuestionFetchingError(prdError.message);
  }

  if (!prdData) {
    throw new PrdNotFoundError();
  }

  try {
    // Get the latest round number
    const latestRoundNumber = await getCurrentRoundNumber(supabase, prdId);

    if (latestRoundNumber === 0) {
      // No rounds exist yet, return empty array
      return { questions: [] };
    }

    // Use getPrdQuestions with the calculated round number to fetch all questions from the latest round
    const paginatedResult = await getPrdQuestions(supabase, prdId, 1, 100, { roundNumber: latestRoundNumber });

    return {
      questions: paginatedResult.questions,
    };
  } catch (error) {
    if (error instanceof PrdNotFoundError || error instanceof PrdQuestionFetchingError) {
      throw error;
    }
    throw new PrdQuestionFetchingError(error instanceof Error ? error.message : "An unknown error occurred");
  }
}
