import { describe, it, expect } from "vitest";
import { LoginSchema, RegisterSchema, PasswordRecoverySchema, UpdatePasswordSchema } from "@/lib/validation/auth";

describe("LoginSchema", () => {
  const validData = {
    email: "test@example.com",
    password: "password123",
  };

  it("should validate correct email and password", () => {
    const result = LoginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should validate password with exactly 6 characters", () => {
    const data = { email: "test@example.com", password: "123456" };
    const result = LoginSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it.each([
    ["missing @", "testexample.com"],
    ["no domain", "test@"],
    ["with spaces", "test @example.com"],
    ["special chars", "test@exa!mple.com"],
    ["no @ symbol", "testexample.com"],
    ["multiple @", "test@@example.com"],
    ["no local part", "@example.com"],
  ])("should return an error for invalid email format: %s", (_, email) => {
    const result = LoginSchema.safeParse({ email, password: "password123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nieprawidłowy format adresu e-mail");
    }
  });

  it("should return an error when password is too short", () => {
    const result = LoginSchema.safeParse({ email: "test@example.com", password: "12345" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Hasło musi mieć co najmniej 6 znaków");
    }
  });

  it("should return an error when email is empty", () => {
    const result = LoginSchema.safeParse({ email: "", password: "password123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Adres e-mail jest wymagany");
    }
  });

  it("should return an error when password is empty", () => {
    const result = LoginSchema.safeParse({ email: "test@example.com", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Hasło musi mieć co najmniej 6 znaków");
    }
  });

  it("should return an error when email is null", () => {
    const result = LoginSchema.safeParse({ email: null, password: "password123" });
    expect(result.success).toBe(false);
  });

  it("should return an error when password is null", () => {
    const result = LoginSchema.safeParse({ email: "test@example.com", password: null });
    expect(result.success).toBe(false);
  });

  it("should return an error when email is undefined", () => {
    const result = LoginSchema.safeParse({ email: undefined, password: "password123" });
    expect(result.success).toBe(false);
  });

  it("should return an error when password is undefined", () => {
    const result = LoginSchema.safeParse({ email: "test@example.com", password: undefined });
    expect(result.success).toBe(false);
  });

  it("should return an error for incorrect data types", () => {
    const result = LoginSchema.safeParse({ email: 12345, password: "password123" });
    expect(result.success).toBe(false);
  });

  it("should return an error when password is a number", () => {
    const result = LoginSchema.safeParse({ email: "test@example.com", password: 123456 });
    expect(result.success).toBe(false);
  });

  it("should return an error when email is an object", () => {
    const result = LoginSchema.safeParse({ email: {}, password: "password123" });
    expect(result.success).toBe(false);
  });
});

describe("RegisterSchema", () => {
  const validData = {
    email: "test@example.com",
    password: "password123",
  };

  it("should validate correct registration data", () => {
    const result = RegisterSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should validate password with exactly 6 characters", () => {
    const data = { email: "test@example.com", password: "123456" };
    const result = RegisterSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it.each([
    ["missing @", "testexample.com"],
    ["no domain", "test@"],
    ["with spaces", "test @example.com"],
    ["special chars", "test@exa!mple.com"],
  ])("should return an error for invalid email format: %s", (_, email) => {
    const result = RegisterSchema.safeParse({ email, password: "password123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nieprawidłowy format adresu e-mail");
    }
  });

  it("should return an error when password is too short", () => {
    const result = RegisterSchema.safeParse({ email: "test@example.com", password: "12345" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Hasło musi mieć co najmniej 6 znaków");
    }
  });

  it("should return an error when email is empty", () => {
    const result = RegisterSchema.safeParse({ email: "", password: "password123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Adres e-mail jest wymagany");
    }
  });

  it("should return an error when password is empty", () => {
    const result = RegisterSchema.safeParse({ email: "test@example.com", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Hasło musi mieć co najmniej 6 znaków");
    }
  });

  it("should return an error when email is null", () => {
    const result = RegisterSchema.safeParse({ email: null, password: "password123" });
    expect(result.success).toBe(false);
  });

  it("should return an error when password is null", () => {
    const result = RegisterSchema.safeParse({ email: "test@example.com", password: null });
    expect(result.success).toBe(false);
  });

  it("should return an error for incorrect data types", () => {
    const result = RegisterSchema.safeParse({ email: 12345, password: "password123" });
    expect(result.success).toBe(false);
  });
});

describe("PasswordRecoverySchema", () => {
  it("should validate correct email", () => {
    const result = PasswordRecoverySchema.safeParse({ email: "test@example.com" });
    expect(result.success).toBe(true);
  });

  it.each([
    ["missing @", "testexample.com"],
    ["no domain", "test@"],
    ["with spaces", "test @example.com"],
    ["special chars", "test@exa!mple.com"],
    ["no @ symbol", "testexample.com"],
    ["multiple @", "test@@example.com"],
  ])("should return an error for invalid email format: %s", (_, email) => {
    const result = PasswordRecoverySchema.safeParse({ email });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nieprawidłowy format adresu e-mail");
    }
  });

  it("should return an error when email is empty", () => {
    const result = PasswordRecoverySchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Adres e-mail jest wymagany");
    }
  });

  it("should return an error when email is null", () => {
    const result = PasswordRecoverySchema.safeParse({ email: null });
    expect(result.success).toBe(false);
  });

  it("should return an error when email is undefined", () => {
    const result = PasswordRecoverySchema.safeParse({ email: undefined });
    expect(result.success).toBe(false);
  });

  it("should return an error for incorrect data type", () => {
    const result = PasswordRecoverySchema.safeParse({ email: 12345 });
    expect(result.success).toBe(false);
  });

  it("should return an error when email is an object", () => {
    const result = PasswordRecoverySchema.safeParse({ email: {} });
    expect(result.success).toBe(false);
  });
});

describe("UpdatePasswordSchema", () => {
  const validData = {
    password: "newpassword123",
    confirmPassword: "newpassword123",
  };

  it("should validate matching passwords", () => {
    const result = UpdatePasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should validate matching passwords with exactly 6 characters", () => {
    const data = { password: "123456", confirmPassword: "123456" };
    const result = UpdatePasswordSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should return an error when passwords do not match", () => {
    const result = UpdatePasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "different123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmPasswordError = result.error.issues.find((issue) => issue.path[0] === "confirmPassword");
      expect(confirmPasswordError?.message).toBe("Hasła muszą być identyczne");
    }
  });

  it("should return an error when password is too short", () => {
    const result = UpdatePasswordSchema.safeParse({
      password: "12345",
      confirmPassword: "12345",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Hasło musi mieć co najmniej 6 znaków");
    }
  });

  it("should return an error when confirmPassword is too short", () => {
    const result = UpdatePasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "12345",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Hasło musi mieć co najmniej 6 znaków");
    }
  });

  it("should return an error when password is empty", () => {
    const result = UpdatePasswordSchema.safeParse({
      password: "",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("should return an error when confirmPassword is empty", () => {
    const result = UpdatePasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "",
    });
    expect(result.success).toBe(false);
  });

  it("should return an error when password is null", () => {
    const result = UpdatePasswordSchema.safeParse({
      password: null,
      confirmPassword: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("should return an error when confirmPassword is null", () => {
    const result = UpdatePasswordSchema.safeParse({
      password: "password123",
      confirmPassword: null,
    });
    expect(result.success).toBe(false);
  });

  it("should return an error when password is undefined", () => {
    const result = UpdatePasswordSchema.safeParse({
      password: undefined,
      confirmPassword: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("should return an error for incorrect data types", () => {
    const result = UpdatePasswordSchema.safeParse({
      password: 123456,
      confirmPassword: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("should return an error when passwords match but one is too short", () => {
    const result = UpdatePasswordSchema.safeParse({
      password: "12345",
      confirmPassword: "12345",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Should have error about password length, not mismatch
      const lengthError = result.error.issues.find((issue) => issue.message === "Hasło musi mieć co najmniej 6 znaków");
      expect(lengthError).toBeDefined();
    }
  });
});
