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

describe("ChoreScopeColumn large-screen props", () => {
  it("preserves the default section layout", () => {
    render(<ChoreScopeColumn scope={board} />);

    const region = screen.getByRole("region", { name: "Today" });

    expect(region).toHaveClass("p-4");
    expect(region).not.toHaveClass("min-h-0");
    expect(region).not.toHaveAttribute("data-emphasis");
  });

  it("fills the available height with an internally scrolling body", () => {
    const { container } = render(<ChoreScopeColumn scope={board} fillHeight />);

    const region = screen.getByRole("region", { name: "Today" });
    const body = container.querySelector('[data-slot="scope-body"]');

    expect(region).toHaveClass("flex", "min-h-0");
    expect(region).not.toHaveClass("p-4");
    expect(body).toBeInTheDocument();
    expect(body).toHaveClass("overflow-y-auto");
  });

  it("emphasizes the section and heading", () => {
    render(<ChoreScopeColumn scope={board} emphasis />);

    const region = screen.getByRole("region", { name: "Today" });
    const heading = screen.getByRole("heading", { name: "Today" });

    expect(region).toHaveAttribute("data-emphasis", "true");
    expect(region).toHaveClass("bg-primary/5");
    expect(heading).toHaveClass("text-xl");
  });

  it("merges a custom section class name", () => {
    render(<ChoreScopeColumn scope={board} className="flex-[1.4]" />);

    expect(screen.getByRole("region", { name: "Today" })).toHaveClass(
      "flex-[1.4]",
    );
  });
});
