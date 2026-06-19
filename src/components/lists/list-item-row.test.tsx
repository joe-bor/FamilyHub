import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { haptics } from "@/lib/haptics";
import type { ListItem } from "@/lib/types";
import { useHapticsPreference } from "@/stores";
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

// Drives the REAL haptics.success() (no spy) through to navigator.vibrate on a
// capable + opted-in device. This is the regression guard for the "no
// double-pulse" invariant: the raw <button> emits success() with no preceding
// tap, so the [12,40,12] pulse survives the shared 40ms throttle. If the
// complete control ever gains a pointerdown tap() (e.g. switched to
// <Button>/usePressable), the success would be coalesced away and this fails.
describe("ListItemRow haptics — real fire reaches the device", () => {
  function setCapableTouchDevice() {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query.includes("coarse"), // touch-primary → canVibrate() true
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(navigator, "vibrate", {
      value: vi.fn(() => true),
      configurable: true,
      writable: true,
    });
  }

  beforeEach(() => {
    // The spied tests above install vi.spyOn(haptics, "success"); the global
    // afterEach clears call history but does NOT restore spies, so without this
    // haptics.success would still be a no-op and never reach navigator.vibrate.
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (navigator as { vibrate?: unknown }).vibrate;
  });

  it("vibrates the success double-pulse [12,40,12] on completion", async () => {
    setCapableTouchDevice();
    useHapticsPreference.setState({
      enabled: true,
      categories: { taps: true, completions: true, back: true },
    });
    const vibrate = navigator.vibrate as ReturnType<typeof vi.fn>;

    render(
      <ListItemRow
        item={baseItem}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /milk/i }));

    expect(vibrate).toHaveBeenCalledWith([12, 40, 12]);
  });
});
