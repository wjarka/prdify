import { z } from "zod";

const NAME_MAX_LENGTH = 200;
const MAIN_PROBLEM_MAX_LENGTH = 5000;
const IN_SCOPE_MAX_LENGTH = 5000;
const OUT_OF_SCOPE_MAX_LENGTH = 5000;
const SUCCESS_CRITERIA_MAX_LENGTH = 2000;

export const createPrdSchema = z.object({
  name: z
    .string({ required_error: "Name is required", invalid_type_error: "Name must be a string" })
    .trim()
    .min(1, "Name cannot be empty")
    .max(NAME_MAX_LENGTH, `Name must be at most ${NAME_MAX_LENGTH} characters long`),
  mainProblem: z
    .string({ required_error: "Main problem is required", invalid_type_error: "Main problem must be a string" })
    .trim()
    .min(1, "Main problem cannot be empty")
    .max(MAIN_PROBLEM_MAX_LENGTH, `Main problem must be at most ${MAIN_PROBLEM_MAX_LENGTH} characters long`),
  inScope: z
    .string({ required_error: "In-scope description is required", invalid_type_error: "In-scope must be a string" })
    .trim()
    .min(1, "In-scope description cannot be empty")
    .max(IN_SCOPE_MAX_LENGTH, `In-scope description must be at most ${IN_SCOPE_MAX_LENGTH} characters long`),
  outOfScope: z
    .string({
      required_error: "Out-of-scope description is required",
      invalid_type_error: "Out-of-scope must be a string",
    })
    .trim()
    .min(1, "Out-of-scope description cannot be empty")
    .max(
      OUT_OF_SCOPE_MAX_LENGTH,
      `Out-of-scope description must be at most ${OUT_OF_SCOPE_MAX_LENGTH} characters long`
    ),
  successCriteria: z
    .string({ required_error: "Success criteria is required", invalid_type_error: "Success criteria must be a string" })
    .trim()
    .min(1, "Success criteria cannot be empty")
    .max(
      SUCCESS_CRITERIA_MAX_LENGTH,
      `Success criteria must be at most ${SUCCESS_CRITERIA_MAX_LENGTH} characters long`
    ),
});

export type CreatePrdSchema = typeof createPrdSchema;

export const getPrdsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(["name", "status", "createdAt", "updatedAt"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type GetPrdsSchema = z.infer<typeof getPrdsSchema>;

export const getPrdByIdSchema = z.object({
  id: z.string().uuid({ message: "Invalid PRD ID format" }),
});

export type GetPrdByIdSchema = z.infer<typeof getPrdByIdSchema>;
