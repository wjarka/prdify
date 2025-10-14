import type { Enums, Tables } from "./db/database.types";

export type Prd = Tables<"prds">;
export type PrdQuestion = Tables<"prd_questions">;
export type PrdStatus = Enums<"prd_status">;

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Data Transfer Object for a Product Requirement Document (PRD).
 * This represents the main PRD entity returned by the API.
 *
 * @see Prd
 */
export interface PrdDto {
  id: string;
  userId: string;
  name: string;
  mainProblem: string;
  inScope: string;
  outOfScope: string;
  successCriteria: string;
  status: PrdStatus;
  summary: string | null;
  content: string | null;
  currentRoundNumber: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Data Transfer Object for a PRD item in a list.
 * This is a lighter version of `PrdDto` for list views.
 *
 * @see PrdDto
 */
export type PrdListItemDto = Pick<PrdDto, "id" | "name" | "status" | "createdAt" | "updatedAt">;

/**
 * Data Transfer Object for a paginated list of PRDs.
 */
export interface PaginatedPrdsDto {
  data: PrdListItemDto[];
  pagination: Pagination;
}

/**
 * Command Model for creating a new PRD.
 * Represents the data required to create a new PRD.
 */
export interface CreatePrdCommand {
  name: string;
  mainProblem: string;
  inScope: string;
  outOfScope: string;
  successCriteria: string;
}

/**
 * Command Model for updating an existing PRD.
 * All fields are optional.
 */
export type UpdatePrdCommand = Partial<Pick<PrdDto, "name">>;

/**
 * Data Transfer Object for a single PRD question.
 *
 * @see PrdQuestion
 */
export interface PrdQuestionDto {
  id: string;
  prdId: string;
  roundNumber: number;
  question: string;
  answer: string | null;
  createdAt: string;
}

/**
 * Data Transfer Object for a paginated list of PRD questions.
 */
export interface PaginatedPrdQuestionsDto {
  questions: PrdQuestionDto[];
  pagination: Pagination;
}

/**
 * Represents a single answer in the `UpdatePrdQuestionsCommand`.
 */
export interface PrdQuestionAnswer {
  questionId: string;
  text: string;
}

/**
 * Command Model for submitting answers to PRD questions.
 */
export interface UpdatePrdQuestionsCommand {
  answers: PrdQuestionAnswer[];
}

/**
 * Data Transfer Object for newly generated PRD questions.
 */
export interface GeneratedPrdQuestionsDto {
  questions: PrdQuestionDto[];
}

/**
 * Data Transfer Object for the latest round of PRD questions.
 */
export interface LatestPrdQuestionRoundDto {
  questions: PrdQuestionDto[];
}

/**
 * Data Transfer Object for a specific round of PRD questions.
 */
export interface PrdQuestionRoundDto {
  questions: PrdQuestionDto[];
}

/**
 * Data Transfer Object for the PRD summary.
 */
export interface PrdSummaryDto {
  summary: string;
}

/**
 * Command Model for updating the PRD summary.
 */
export interface UpdatePrdSummaryCommand {
  summary: string;
}

/**
 * Data Transfer Object for the final PRD document.
 */
export interface PrdDocumentDto {
  content: string;
}

/**
 * Command Model for updating the final PRD document.
 */
export interface UpdatePrdDocumentCommand {
  content: string;
}

/**
 * Data Transfer Object for a completed PRD.
 * It has the same structure as the main `PrdDto`.
 *
 * @see PrdDto
 */
export type CompletedPrdDto = PrdDto;
