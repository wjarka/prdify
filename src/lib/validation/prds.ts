import { z } from "zod";

const NAME_MAX_LENGTH = 200;
const MAIN_PROBLEM_MAX_LENGTH = 5000;
const IN_SCOPE_MAX_LENGTH = 5000;
const OUT_OF_SCOPE_MAX_LENGTH = 5000;
const SUCCESS_CRITERIA_MAX_LENGTH = 2000;

export const createPrdSchema = z.object({
  name: z
    .string({ required_error: "Nazwa jest wymagana", invalid_type_error: "Nazwa musi być tekstem" })
    .trim()
    .min(1, "Nazwa nie może być pusta")
    .max(NAME_MAX_LENGTH, `Nazwa może mieć maksymalnie ${NAME_MAX_LENGTH} znaków`),
  mainProblem: z
    .string({ required_error: "Główny problem jest wymagany", invalid_type_error: "Główny problem musi być tekstem" })
    .trim()
    .min(1, "Główny problem nie może być pusty")
    .max(MAIN_PROBLEM_MAX_LENGTH, `Główny problem może mieć maksymalnie ${MAIN_PROBLEM_MAX_LENGTH} znaków`),
  inScope: z
    .string({ required_error: "Zakres jest wymagany", invalid_type_error: "Zakres musi być tekstem" })
    .trim()
    .min(1, "Zakres nie może być pusty")
    .max(IN_SCOPE_MAX_LENGTH, `Zakres może mieć maksymalnie ${IN_SCOPE_MAX_LENGTH} znaków`),
  outOfScope: z
    .string({
      required_error: "Poza zakresem jest wymagane",
      invalid_type_error: "Poza zakresem musi być tekstem",
    })
    .trim()
    .min(1, "Poza zakresem nie może być puste")
    .max(OUT_OF_SCOPE_MAX_LENGTH, `Poza zakresem może mieć maksymalnie ${OUT_OF_SCOPE_MAX_LENGTH} znaków`),
  successCriteria: z
    .string({
      required_error: "Kryteria sukcesu są wymagane",
      invalid_type_error: "Kryteria sukcesu muszą być tekstem",
    })
    .trim()
    .min(1, "Kryteria sukcesu nie mogą być puste")
    .max(SUCCESS_CRITERIA_MAX_LENGTH, `Kryteria sukcesu mogą mieć maksymalnie ${SUCCESS_CRITERIA_MAX_LENGTH} znaków`),
});

export type CreatePrdSchema = typeof createPrdSchema;

export const getPrdsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(["name", "status", "createdAt", "updatedAt"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type GetPrdsSchema = z.infer<typeof getPrdsSchema>;

export const prdIdSchema = z.object({
  id: z.string().uuid({ message: "Nieprawidłowy format ID dokumentu PRD" }),
});

export type PrdIdSchema = z.infer<typeof prdIdSchema>;

export const updatePrdSchema = z
  .object({
    name: z
      .string({ required_error: "Nazwa jest wymagana", invalid_type_error: "Nazwa musi być tekstem" })
      .trim()
      .min(1, "Nazwa nie może być pusta")
      .max(NAME_MAX_LENGTH, `Nazwa może mieć maksymalnie ${NAME_MAX_LENGTH} znaków`)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Przynajmniej jedno pole musi być podane do aktualizacji.",
    path: [], // an empty path makes it a global error
  });

export type UpdatePrdSchema = z.infer<typeof updatePrdSchema>;
