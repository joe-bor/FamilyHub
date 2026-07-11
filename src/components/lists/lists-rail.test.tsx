import type { ListSummary } from "@/lib/types";
import { render, renderWithUser, screen } from "@/test/test-utils";
import { ListsRail } from "./lists-rail";

const summaries: ListSummary[] = [
  {
    id: "a",
    name: "Groceries",
    kind: "grocery",
    totalItems: 3,
    completedItems: 1,
  },
  {
    id: "b",
    name: "Chores",
    kind: "to-do",
    totalItems: 2,
    completedItems: 0,
  },
];

describe("ListsRail", () => {
  it("renders the create action and identifies the selected list", () => {
    render(
      <ListsRail
        summaries={summaries}
        selectedListId="b"
        onSelect={vi.fn()}
        onCreate={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "New List" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /chores, selected, 2 items remaining/i,
      }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      screen.getByRole("button", { name: /^groceries/i }),
    ).not.toHaveAttribute("aria-current");
  });

  it("selects a list and creates a new list", async () => {
    const onSelect = vi.fn();
    const onCreate = vi.fn();
    const { user } = renderWithUser(
      <ListsRail
        summaries={summaries}
        selectedListId={null}
        onSelect={onSelect}
        onCreate={onCreate}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^chores/i }));
    expect(onSelect).toHaveBeenCalledWith("b");

    await user.click(screen.getByRole("button", { name: "New List" }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
