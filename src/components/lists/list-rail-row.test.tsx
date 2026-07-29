import type { ListSummary } from "@/lib/types";
import { render, renderWithUser, screen } from "@/test/test-utils";
import { ListRailRow } from "./list-rail-row";

const list: ListSummary = {
  id: "l1",
  name: "Groceries",
  kind: "grocery",
  totalItems: 6,
  completedItems: 2,
};

describe("ListRailRow", () => {
  it("identifies the selected row and its progress", () => {
    render(<ListRailRow list={list} selected onSelect={vi.fn()} />);

    expect(
      screen.getByRole("button", {
        name: /groceries, selected, 2 of 6 done/i,
      }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("selects an unselected row when clicked", async () => {
    const onSelect = vi.fn();
    const { user } = renderWithUser(
      <ListRailRow list={list} selected={false} onSelect={onSelect} />,
    );
    const row = screen.getByRole("button", {
      name: /groceries, 2 of 6 done/i,
    });

    expect(row).not.toHaveAttribute("aria-current");
    await user.click(row);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("meets the minimum touch target height", () => {
    render(<ListRailRow list={list} selected={false} onSelect={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /groceries, 2 of 6 done/i }),
    ).toHaveClass("min-h-[44px]");
  });
});
