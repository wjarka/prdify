import { describe, it, expect } from "vitest";
import { createPrdSchema, getPrdsSchema, prdIdSchema, updatePrdSchema } from "@/lib/validation/prds";

describe("createPrdSchema", () => {
  const validData = {
    name: "Test Project",
    mainProblem: "This is the main problem.",
    inScope: "This is in scope.",
    outOfScope: "This is out of scope.",
    successCriteria: "These are the success criteria.",
  };

  it("should validate correct data successfully", () => {
    const result = createPrdSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should trim whitespace from all fields", () => {
    const dataWithWhitespace = {
      name: "  Test Project  ",
      mainProblem: "  This is the main problem.  ",
      inScope: "  This is in scope.  ",
      outOfScope: "  This is out of scope.  ",
      successCriteria: "  These are the success criteria.  ",
    };
    const result = createPrdSchema.safeParse(dataWithWhitespace);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it.each([
    ["name", { ...validData, name: "" }, "Nazwa nie może być pusta"],
    ["mainProblem", { ...validData, mainProblem: " " }, "Główny problem nie może być pusty"],
    ["inScope", { ...validData, inScope: "" }, "Zakres nie może być pusty"],
    ["outOfScope", { ...validData, outOfScope: " " }, "Poza zakresem nie może być puste"],
    ["successCriteria", { ...validData, successCriteria: "" }, "Kryteria sukcesu nie mogą być puste"],
  ])("should return an error if required field '%s' is empty", (field, data, expectedError) => {
    const result = createPrdSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(expectedError);
    }
  });

  it.each([
    ["name", { ...validData, name: "a".repeat(201) }, "Nazwa może mieć maksymalnie 200 znaków"],
    [
      "mainProblem",
      { ...validData, mainProblem: "a".repeat(5001) },
      "Główny problem może mieć maksymalnie 5000 znaków",
    ],
  ])("should return an error if field '%s' exceeds max length", (field, data, expectedError) => {
    const result = createPrdSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(expectedError);
    }
  });

  it("should return an error for incorrect data types", () => {
    const invalidData = { ...validData, name: 12345 };
    const result = createPrdSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nazwa musi być tekstem");
    }
  });
});

describe("getPrdsSchema", () => {
  it("should apply default values when no input is provided", () => {
    const result = getPrdsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        page: 1,
        limit: 10,
        sortBy: "updatedAt",
        order: "desc",
      });
    }
  });

  it("should accept and parse valid query parameters", () => {
    const query = { page: "2", limit: "50", sortBy: "name", order: "asc" };
    const result = getPrdsSchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        page: 2,
        limit: 50,
        sortBy: "name",
        order: "asc",
      });
    }
  });

  it("should return an error for invalid 'sortBy' or 'order' values", () => {
    const invalidQuery = { sortBy: "invalidField", order: "sideways" };
    const result = getPrdsSchema.safeParse(invalidQuery);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(2); // Both fields are invalid
    }
  });

  it.each([
    ["page", { page: 0 }],
    ["limit", { limit: -10 }],
    ["limit", { limit: 200 }], // > 100
  ])("should return an error for invalid numeric value for '%s'", (_, query) => {
    const result = getPrdsSchema.safeParse(query);
    expect(result.success).toBe(false);
  });
});

describe("prdIdSchema", () => {
  it("should validate a correct UUID", () => {
    const valid = { id: "a1b2c3d4-e5f6-7890-1234-567890abcdef" };
    const result = prdIdSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("should return an error for an invalid UUID format", () => {
    const invalid = { id: "not-a-uuid" };
    const result = prdIdSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nieprawidłowy format ID dokumentu PRD");
    }
  });
});

describe("updatePrdSchema", () => {
  it("should validate a correct update payload", () => {
    const validPayload = { name: "New Project Name" };
    const result = updatePrdSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("New Project Name");
    }
  });

  it("should return an error if the name is an empty string", () => {
    const invalidPayload = { name: " " };
    const result = updatePrdSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nazwa nie może być pusta");
    }
  });

  it("should return an error if the name exceeds the maximum length", () => {
    const invalidPayload = { name: "a".repeat(201) };
    const result = updatePrdSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nazwa może mieć maksymalnie 200 znaków");
    }
  });

  it("should return an error for an empty payload due to .refine()", () => {
    const emptyPayload = {};
    const result = updatePrdSchema.safeParse(emptyPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Przynajmniej jedno pole musi być podane do aktualizacji.");
    }
  });

  it("should strip unknown properties from the payload", () => {
    const payloadWithExtra = { name: "Valid Name", anotherProp: "should be removed" };
    const result = updatePrdSchema.safeParse(payloadWithExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Valid Name" });
      expect(result.data).not.toHaveProperty("anotherProp");
    }
  });
});
