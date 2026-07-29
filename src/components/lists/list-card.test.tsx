import type { ListSummary } from "@/lib/types";
import { render, screen } from "@/test/test-utils";
import { ListCard } from "./list-card";

const baseList: ListSummary = {
  id: "l1",
  name: "Groceries",
  kind: "grocery",
  totalItems: 3,
  completedItems: 0,
};

describe("ListCard progress", () => {
  it("states progress once, not twice", () => {
    render(<ListCard list={baseList} onOpen={() => {}} />);
    expect(screen.getByText("0 of 3 done")).toBeInTheDocument();
    expect(screen.queryByText(/items? left/i)).toBeNull();
  });

  it("keeps the empty-state copy", () => {
    render(
      <ListCard
        list={{ ...baseList, totalItems: 0, completedItems: 0 }}
        onOpen={() => {}}
      />,
    );
    expect(screen.getByText("No items yet")).toBeInTheDocument();
    expect(screen.queryByText("Ready to fill")).toBeNull();
  });
});
