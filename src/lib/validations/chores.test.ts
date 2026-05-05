import { describe, expect, it } from "vitest";
import { choreFormSchema } from "./chores";

describe("choreFormSchema", () => {
  it("requires title and assignee", () => {
    const result = choreFormSchema.safeParse({
      title: "",
      assignedToMemberId: "",
      dueDate: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["title", "assignedToMemberId"]),
      );
    }
  });

  it("trims title and preserves a date-only due date", () => {
    const result = choreFormSchema.safeParse({
      title: "  Take out trash  ",
      assignedToMemberId: "member-1",
      dueDate: "2026-05-05",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        title: "Take out trash",
        assignedToMemberId: "member-1",
        dueDate: "2026-05-05",
      });
    }
  });

  it("rejects malformed due dates", () => {
    const result = choreFormSchema.safeParse({
      title: "Take out trash",
      assignedToMemberId: "member-1",
      dueDate: "05/05/2026",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["dueDate"]);
    }
  });
});
