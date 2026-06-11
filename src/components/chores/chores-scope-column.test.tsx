import { describe, expect, it } from "vitest";
import type { ChoreScopeBoard } from "@/lib/types";
import { render, screen } from "@/test/test-utils";
import { ChoreScopeColumn } from "./chores-scope-column";

const board: ChoreScopeBoard = {
  scope: "TODAY",
  periodStartDate: "2026-06-11",
  periodEndDate: "2026-06-11",
  summary: { total: 2, completed: 1, remaining: 1 },
  assignees: [],
};

describe("ChoreScopeColumn", () => {
  it("shows the period heading by default", () => {
    render(<ChoreScopeColumn scope={board} />);

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
  });

  it("hides the heading but keeps the accessible name when showHeading is false", () => {
    render(<ChoreScopeColumn scope={board} showHeading={false} />);

    expect(screen.queryByRole("heading", { name: "Today" })).toBeNull();
    expect(screen.getByRole("region", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText(/1 left of 2/i)).toBeInTheDocument();
  });
});
