import type { SupabaseClient } from "../../db/supabase.client";
import type { PrdQuestionDto, PrdDto } from "../../types";
import { getPrdById } from "./prds";
import { getPrdQuestions } from "./prdQuestion.service";

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
 * Constructs a prompt for the AI service to generate a PRD summary
 */
function constructSummaryPrompt(prd: PrdDto, questions: PrdQuestionDto[]): string {
  const qAndASection = questions
    .map((q, index) => `Q${index + 1}: ${q.question}\nA${index + 1}: ${q.answer}`)
    .join("\n\n");

  return `Based on the following Product Requirement Document (PRD) information and the Q&A session that followed, generate a comprehensive summary of the planning session.

PRD Details:
Name: ${prd.name}
Main Problem: ${prd.mainProblem}
In Scope: ${prd.inScope}
Out of Scope: ${prd.outOfScope}
Success Criteria: ${prd.successCriteria}

Q&A Session:
${qAndASection}

Please provide a detailed summary that captures the key insights, clarifications, and refinements that emerged from the Q&A session. Focus on how the answers helped shape and refine the understanding of the PRD requirements.`;
}

/**
 * Mock AI service call for generating summary
 * TODO: Replace with actual AI service integration (OpenRouter.ai)
 */
async function generateSummaryWithAI(prompt: string): Promise<string> {
  // Mock implementation - in real implementation, this would call OpenRouter.ai

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock response - in real implementation, this would be the AI-generated summary
  return `## Planning Session Summary

Based on the comprehensive Q&A session conducted for the PRD "${prompt.split("\n")[2].split(": ")[1]}", the following key insights and clarifications have been identified:

### Key Requirements Confirmed
- The main problem statement has been validated through detailed questioning
- Scope boundaries have been clearly defined and agreed upon
- Success criteria have been refined based on stakeholder feedback

### Critical Clarifications
- Several important details were uncovered during the questioning phase
- Technical constraints and business requirements were thoroughly explored
- Edge cases and potential implementation challenges were identified

### Next Steps
This summary represents the culmination of the planning phase and provides a solid foundation for moving forward to the PRD drafting stage. All critical questions have been addressed, and the project team has a clear understanding of the requirements and constraints.`;
}
