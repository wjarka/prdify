import type { PostgrestError } from "@supabase/supabase-js";

import type { SupabaseClient } from "../../db/supabase.client";
import type { Prd, PrdDto, CreatePrdCommand, PaginatedPrdsDto, PrdListItemDto, UpdatePrdCommand } from "../../types";
import type { GetPrdsSchema } from "../validation/prds";

const UNIQUE_VIOLATION_CODE = "23505";
const POSTGREST_NOT_FOUND_CODE = "PGRST116";
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

export class PrdFetchingError extends Error {
  constructor(message = "Unable to fetch PRDs") {
    super(message);
    this.name = "PrdFetchingError";
  }
}

export class PrdUpdateError extends Error {
  constructor(message = "Unable to update PRD") {
    super(message);
    this.name = "PrdUpdateError";
  }
}

export class PrdConflictError extends Error {
  constructor(message = "PRD is completed and cannot be modified") {
    super(message);
    this.name = "PrdConflictError";
  }
}

export class RoundNumberCalculationError extends Error {
  constructor(message = "Unable to calculate current round number") {
    super(message);
    this.name = "RoundNumberCalculationError";
  }
}

export class PrdNotFoundError extends Error {
  constructor(message = "PRD not found") {
    super(message);
    this.name = "PrdNotFoundError";
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
    throw new RoundNumberCalculationError(error.message);
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

function handlePrdUpdatePostgrestError(error: PostgrestError): never {
  if (error.code === UNIQUE_VIOLATION_CODE) {
    throw new PrdNameConflictError();
  }

  throw new PrdUpdateError(error.message);
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

  try {
    return await mapPrdRowToDto(supabase, data as Prd);
  } catch (error) {
    if (error instanceof RoundNumberCalculationError) {
      throw new PrdCreationError(error.message);
    }
    throw error;
  }
}

export async function updatePrd(supabase: SupabaseClient, id: string, command: UpdatePrdCommand): Promise<PrdDto> {
  const { data: existingPrd, error: fetchError } = await supabase.from("prds").select("*").eq("id", id).single();

  if (fetchError) {
    if (fetchError.code === POSTGREST_NOT_FOUND_CODE) {
      throw new PrdNotFoundError();
    }
    throw new PrdFetchingError(fetchError.message);
  }

  if (existingPrd.status === "completed") {
    throw new PrdConflictError();
  }

  const { data, error } = await supabase.from("prds").update({ name: command.name }).eq("id", id).select().single();

  if (error) {
    handlePrdUpdatePostgrestError(error);
  }

  if (!data) {
    throw new PrdUpdateError();
  }

  try {
    return await mapPrdRowToDto(supabase, data as Prd);
  } catch (error) {
    if (error instanceof RoundNumberCalculationError) {
      throw new PrdUpdateError(error.message);
    }
    throw error;
  }
}

export async function getPrdById(supabase: SupabaseClient, id: string): Promise<PrdDto> {
  const { data, error } = await supabase.from("prds").select("*").eq("id", id).single();

  if (error) {
    if (error.code === POSTGREST_NOT_FOUND_CODE) {
      throw new PrdNotFoundError();
    }
    throw new PrdFetchingError(error.message);
  }

  try {
    return await mapPrdRowToDto(supabase, data as Prd);
  } catch (error) {
    if (error instanceof RoundNumberCalculationError) {
      throw new PrdFetchingError(error.message);
    }
    throw error;
  }
}

const SortByMap: Record<GetPrdsSchema["sortBy"], string> = {
  name: "name",
  status: "status",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

export async function getPrds(
  supabase: SupabaseClient,
  userId: string,
  options: GetPrdsSchema
): Promise<PaginatedPrdsDto> {
  const { page, limit, sortBy, order } = options;
  const offset = (page - 1) * limit;
  const sortByColumn = SortByMap[sortBy];

  try {
    const countQuery = supabase.from("prds").select("*", { count: "exact", head: true }).eq("user_id", userId);
    const prdsQuery = supabase
      .from("prds")
      .select("id, name, status, created_at, updated_at")
      .eq("user_id", userId)
      .order(sortByColumn, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    const [{ count, error: countError }, { data: prdsData, error: prdsError }] = await Promise.all([
      countQuery,
      prdsQuery,
    ]);

    if (countError) {
      throw new PrdFetchingError(countError.message);
    }

    if (prdsError) {
      throw new PrdFetchingError(prdsError.message);
    }

    const totalItems = count ?? 0;
    const totalPages = Math.ceil(totalItems / limit);

    const prds = prdsData?.map(
      (prd): PrdListItemDto => ({
        id: prd.id,
        name: prd.name,
        status: prd.status,
        createdAt: prd.created_at,
        updatedAt: prd.updated_at,
      })
    );

    return {
      data: prds ?? [],
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  } catch (error) {
    if (error instanceof PrdFetchingError) {
      throw error;
    }
    throw new PrdFetchingError(error instanceof Error ? error.message : "An unknown error occurred");
  }
}

export async function deletePrd(supabase: SupabaseClient, id: string): Promise<void> {
  const { error, count } = await supabase.from("prds").delete({ count: "exact" }).eq("id", id);

  if (error) {
    throw new PrdFetchingError(error.message);
  }

  if (count === 0) {
    throw new PrdNotFoundError();
  }
}
