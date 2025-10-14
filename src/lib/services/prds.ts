import type { PostgrestError } from "@supabase/supabase-js";

import type { SupabaseClient } from "../../db/supabase.client";
import type { Prd, PrdDto, CreatePrdCommand } from "../../types";

const UNIQUE_VIOLATION_CODE = "23505";
const INITIAL_PRD_STATUS: PrdDto["status"] = "planning";

export class PrdNameConflictError extends Error {
  constructor(message = "PRD name must be unique per user") {
    super(message);
    this.name = "PrdNameConflictError";
  }
}

export class PrdCreationError extends Error {
  constructor(message = "Unable to create PRD") {
    super(message);
    this.name = "PrdCreationError";
  }
}

async function getCurrentRoundNumber(supabase: SupabaseClient, prdId: string): Promise<number> {
  const { data, error } = await supabase
    .from("prd_questions")
    .select("round_number")
    .eq("prd_id", prdId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new PrdCreationError(error.message);
  }

  return data?.round_number ?? 0;
}

async function mapPrdRowToDto(supabase: SupabaseClient, row: Prd): Promise<PrdDto> {
  const currentRoundNumber = await getCurrentRoundNumber(supabase, row.id);

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    mainProblem: row.main_problem,
    inScope: row.in_scope,
    outOfScope: row.out_of_scope,
    successCriteria: row.success_criteria,
    status: row.status,
    summary: row.summary,
    content: row.content,
    currentRoundNumber,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function handlePostgrestError(error: PostgrestError): never {
  if (error.code === UNIQUE_VIOLATION_CODE) {
    throw new PrdNameConflictError();
  }

  throw new PrdCreationError(error.message);
}

export async function createPrd(supabase: SupabaseClient, userId: string, command: CreatePrdCommand): Promise<PrdDto> {
  const payload = {
    user_id: userId,
    name: command.name,
    main_problem: command.mainProblem,
    in_scope: command.inScope,
    out_of_scope: command.outOfScope,
    success_criteria: command.successCriteria,
    status: INITIAL_PRD_STATUS,
    summary: null,
    content: null,
  };

  const { data, error } = await supabase.from("prds").insert(payload).select().single();

  if (error) {
    handlePostgrestError(error);
  }

  if (!data) {
    throw new PrdCreationError();
  }

  return mapPrdRowToDto(supabase, data as Prd);
}
