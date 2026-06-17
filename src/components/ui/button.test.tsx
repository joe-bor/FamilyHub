import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button press feedback", () => {
  it("carries the pressable class", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button").className).toContain(
      "active:scale-[0.97]",
    );
  });
  it("fires the pressable seam and the caller's onPointerDown", () => {
    const onPointerDown = vi.fn();
    render(<Button onPointerDown={onPointerDown}>Save</Button>);
    screen
      .getByRole("button")
      .dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });
});
