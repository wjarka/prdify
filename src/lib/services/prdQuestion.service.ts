import type { PostgrestError } from "@supabase/supabase-js";

import type { SupabaseClient } from "../../db/supabase.client";
import type { PrdQuestion, PrdQuestionDto, PaginatedPrdQuestionsDto, UpdatePrdQuestionsCommand } from "../../types";

const POSTGREST_NOT_FOUND_CODE = "PGRST116";

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
 * Retrieves paginated PRD questions for a specific PRD
 * Includes authorization check to ensure user owns the PRD
 */
export async function getPrdQuestions(
  supabase: SupabaseClient,
  prdId: string,
  page: number,
  limit: number
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
    // Get total count of questions for the PRD
    const { count, error: countError } = await supabase
      .from("prd_questions")
      .select("*", { count: "exact", head: true })
      .eq("prd_id", prdId);

    if (countError) {
      handlePrdQuestionPostgrestError(countError);
    }

    // Get paginated questions
    const { data: questionsData, error: questionsError } = await supabase
      .from("prd_questions")
      .select("*")
      .eq("prd_id", prdId)
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
