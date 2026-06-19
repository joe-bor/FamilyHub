import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { haptics } from "@/lib/haptics";
import type { ListItem } from "@/lib/types";
import { ListItemRow } from "./list-item-row";

// Cast: the row only reads id/text/completed; ListItem requires more fields.
const baseItem = { id: "1", text: "Milk", completed: false } as ListItem;

describe("ListItemRow haptics", () => {
  it("fires success() when completing an item", async () => {
    const success = vi.spyOn(haptics, "success").mockImplementation(() => {});
    render(
      <ListItemRow
        item={baseItem}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /milk/i }));
    expect(success).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire success() when un-completing", async () => {
    const success = vi.spyOn(haptics, "success").mockImplementation(() => {});
    render(
      <ListItemRow
        item={{ ...baseItem, completed: true }}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /milk/i }));
    expect(success).not.toHaveBeenCalled();
  });
});
