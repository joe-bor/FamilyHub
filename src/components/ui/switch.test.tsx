import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./switch";

describe("Switch", () => {
  it("renders a switch reflecting checked state", () => {
    render(<Switch checked aria-label="Haptics" onCheckedChange={() => {}} />);
    const sw = screen.getByRole("switch", { name: "Haptics" });
    expect(sw).toBeInTheDocument();
    expect(sw).toBeChecked();
  });

  it("calls onCheckedChange when toggled", async () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch
        checked={false}
        aria-label="Haptics"
        onCheckedChange={onCheckedChange}
      />,
    );
    await userEvent.click(screen.getByRole("switch", { name: "Haptics" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
