import { describe, expect, it } from "vitest";
import { choreFormSchema } from "./chores";

describe("choreFormSchema", () => {
  it("requires title, assignee, and cadence", () => {
    const result = choreFormSchema.safeParse({
      title: "",
      assignedToMemberId: "",
      cadence: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["title", "assignedToMemberId", "cadence"]),
      );
    }
  });

  it("trims title and preserves recurring template cadence", () => {
    const result = choreFormSchema.safeParse({
      title: "  Take out trash  ",
      assignedToMemberId: "member-1",
      cadence: "WEEKLY",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        title: "Take out trash",
        assignedToMemberId: "member-1",
        cadence: "WEEKLY",
      });
    }
  });

  it("rejects unsupported cadences", () => {
    const result = choreFormSchema.safeParse({
      title: "Take out trash",
      assignedToMemberId: "member-1",
      cadence: "YEARLY",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["cadence"]);
    }
  });
});
