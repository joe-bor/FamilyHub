import { describe, expect, it } from "vitest";
import { usernameSchema } from "./auth";

describe("auth validations", () => {
  describe("usernameSchema", () => {
    it("accepts username at exactly 20 characters", () => {
      const result = usernameSchema.safeParse("a".repeat(20));
      expect(result.success).toBe(true);
    });

    it("rejects username at 21 characters", () => {
      const result = usernameSchema.safeParse("a".repeat(21));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Username must be 20 characters or less",
        );
      }
    });

    it("accepts username at exactly 3 characters", () => {
      const result = usernameSchema.safeParse("abc");
      expect(result.success).toBe(true);
    });

    it("rejects username at 2 characters", () => {
      const result = usernameSchema.safeParse("ab");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Username must be at least 3 characters",
        );
      }
    });
  });
});
