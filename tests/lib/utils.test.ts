import { describe, it, expect } from "vitest";
import { cn, snakeToCamel, camelToSnake } from "@/lib/utils";

describe("cn", () => {
  it("should merge class names correctly", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn("base", isActive && "active", isDisabled && "disabled");
    expect(result).toBe("base active");
  });

  it("should merge Tailwind classes correctly", () => {
    // tailwind-merge should deduplicate conflicting classes
    const result = cn("px-2 py-1", "px-4 py-2");
    // The result should contain py-2 and px-4 (conflicting classes replaced)
    expect(result).toContain("py-2");
    expect(result).toContain("px-4");
    expect(result).not.toContain("px-2");
    expect(result).not.toContain("py-1");
  });

  it("should handle empty strings and null/undefined", () => {
    const result = cn("foo", "", null, undefined, "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle arrays of class names", () => {
    const result = cn(["foo", "bar"], "baz");
    expect(result).toBe("foo bar baz");
  });

  it("should handle objects with conditional classes", () => {
    const result = cn({
      foo: true,
      bar: false,
      baz: true,
    });
    expect(result).toBe("foo baz");
  });

  it("should return empty string when no arguments provided", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle mixed input types", () => {
    const result = cn("base", ["array", "classes"], { conditional: true, disabled: false }, null, undefined, "");
    expect(result).toBe("base array classes conditional");
  });
});

describe("snakeToCamel", () => {
  describe("basic conversions", () => {
    it("should convert simple snake_case to camelCase", () => {
      expect(snakeToCamel("hello_world")).toBe("helloWorld");
    });

    it("should convert multiple underscores", () => {
      expect(snakeToCamel("hello_world_test")).toBe("helloWorldTest");
    });

    it("should convert single character after underscore", () => {
      expect(snakeToCamel("test_a")).toBe("testA");
    });

    it("should handle uppercase letters after underscore", () => {
      expect(snakeToCamel("test_A")).toBe("testA");
    });

    it("should handle numbers after underscore", () => {
      expect(snakeToCamel("test_1")).toBe("test1");
    });
  });

  describe("edge cases", () => {
    it("should return empty string for empty input", () => {
      expect(snakeToCamel("")).toBe("");
    });

    it("should handle string with no underscores", () => {
      expect(snakeToCamel("hello")).toBe("hello");
    });

    it("should handle string starting with underscore", () => {
      // The function converts _X to X, so _hello becomes Hello
      expect(snakeToCamel("_hello")).toBe("Hello");
    });

    it("should handle string ending with underscore", () => {
      // Trailing underscores are preserved
      expect(snakeToCamel("hello_")).toBe("hello_");
    });

    it("should handle consecutive underscores", () => {
      // Consecutive underscores create a boundary, converting the next character
      expect(snakeToCamel("hello__world")).toBe("hello_World");
    });

    it("should handle multiple consecutive underscores", () => {
      // Multiple underscores still create boundaries
      expect(snakeToCamel("hello___world")).toBe("hello__World");
    });

    it("should handle string with only underscores", () => {
      // Only underscores remain as-is (no character to convert after _)
      expect(snakeToCamel("___")).toBe("___");
    });

    it("should handle uppercase letters correctly", () => {
      // Uppercase letters after underscore are converted to uppercase in camelCase
      expect(snakeToCamel("HELLO_WORLD")).toBe("HELLOWORLD");
    });

    it("should handle mixed case", () => {
      expect(snakeToCamel("Hello_World_Test")).toBe("HelloWorldTest");
    });
  });

  describe("real-world scenarios", () => {
    it("should convert database field names", () => {
      expect(snakeToCamel("user_id")).toBe("userId");
      expect(snakeToCamel("created_at")).toBe("createdAt");
      expect(snakeToCamel("updated_at")).toBe("updatedAt");
    });

    it("should convert API response keys", () => {
      expect(snakeToCamel("first_name")).toBe("firstName");
      expect(snakeToCamel("last_name")).toBe("lastName");
      expect(snakeToCamel("is_active")).toBe("isActive");
    });

    it("should handle complex nested-like structures", () => {
      expect(snakeToCamel("parent_child_grandchild")).toBe("parentChildGrandchild");
    });
  });
});

describe("camelToSnake", () => {
  describe("basic conversions", () => {
    it("should convert simple camelCase to snake_case", () => {
      expect(camelToSnake("helloWorld")).toBe("hello_world");
    });

    it("should convert multiple camelCase words", () => {
      expect(camelToSnake("helloWorldTest")).toBe("hello_world_test");
    });

    it("should handle single word", () => {
      expect(camelToSnake("hello")).toBe("hello");
    });

    it("should handle string starting with uppercase", () => {
      expect(camelToSnake("HelloWorld")).toBe("hello_world");
    });

    it("should handle numbers in camelCase", () => {
      expect(camelToSnake("test1Value")).toBe("test1_value");
      expect(camelToSnake("value2Test")).toBe("value2_test");
    });
  });

  describe("edge cases", () => {
    it("should return empty string for empty input", () => {
      expect(camelToSnake("")).toBe("");
    });

    it("should handle single character", () => {
      expect(camelToSnake("a")).toBe("a");
      expect(camelToSnake("A")).toBe("a");
    });

    it("should handle consecutive uppercase letters", () => {
      // Consecutive uppercase letters are treated as a single word
      // XMLHttp becomes xmlhttp (no split between XML and Http)
      expect(camelToSnake("XMLHttpRequest")).toBe("xmlhttp_request");
    });

    it("should handle all uppercase string", () => {
      expect(camelToSnake("HELLO")).toBe("hello");
    });

    it("should handle string with numbers", () => {
      expect(camelToSnake("test123Value")).toBe("test123_value");
    });

    it("should handle already snake_case strings", () => {
      // This will still convert if there are camelCase boundaries
      expect(camelToSnake("hello_world")).toBe("hello_world");
    });

    it("should handle mixed case with numbers", () => {
      expect(camelToSnake("iPhone12Pro")).toBe("i_phone12_pro");
    });
  });

  describe("real-world scenarios", () => {
    it("should convert JavaScript object keys", () => {
      expect(camelToSnake("userId")).toBe("user_id");
      expect(camelToSnake("createdAt")).toBe("created_at");
      expect(camelToSnake("updatedAt")).toBe("updated_at");
    });

    it("should convert form field names", () => {
      expect(camelToSnake("firstName")).toBe("first_name");
      expect(camelToSnake("lastName")).toBe("last_name");
      expect(camelToSnake("isActive")).toBe("is_active");
    });

    it("should handle React component prop names", () => {
      expect(camelToSnake("onClick")).toBe("on_click");
      expect(camelToSnake("onChange")).toBe("on_change");
    });

    it("should handle complex nested-like structures", () => {
      expect(camelToSnake("parentChildGrandchild")).toBe("parent_child_grandchild");
    });
  });
});

describe("round-trip conversions", () => {
  it("should convert snake_case to camelCase and back", () => {
    const original = "hello_world_test";
    const camel = snakeToCamel(original);
    const snake = camelToSnake(camel);
    expect(snake).toBe(original);
  });

  it("should convert camelCase to snake_case and back", () => {
    const original = "helloWorldTest";
    const snake = camelToSnake(original);
    const camel = snakeToCamel(snake);
    expect(camel).toBe(original);
  });

  it("should handle database field round-trip", () => {
    const original = "user_id";
    const camel = snakeToCamel(original);
    const snake = camelToSnake(camel);
    expect(snake).toBe(original);
  });

  it("should handle JavaScript object key round-trip", () => {
    const original = "userId";
    const snake = camelToSnake(original);
    const camel = snakeToCamel(snake);
    expect(camel).toBe(original);
  });
});
