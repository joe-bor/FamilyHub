import { describe, expect, it, vi } from "vitest";
import { renderWithUser, screen } from "@/test/test-utils";
import { WeekHeader } from "./week-header";

describe("WeekHeader", () => {
  const props = {
    weekStartDate: "2026-07-12",
    readOnly: false,
    onWeekChange: vi.fn(),
  };

  it("renders actions inside the toolbar alongside previous-week navigation", () => {
    renderWithUser(
      <WeekHeader
        {...props}
        actions={<button type="button">Fill empty slots</button>}
      />,
    );

    const actionsButton = screen.getByRole("button", {
      name: "Fill empty slots",
    });
    expect(actionsButton.closest('[data-slot="week-header"]')).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Previous week" }),
    ).toBeInTheDocument();
  });

  it("keeps navigation available without rendering an actions button", () => {
    renderWithUser(<WeekHeader {...props} />);

    expect(
      screen.queryByRole("button", { name: "Fill empty slots" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next week" }),
    ).toBeInTheDocument();
  });
});
