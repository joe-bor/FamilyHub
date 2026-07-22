import userEvent from "@testing-library/user-event";
import { addDays } from "date-fns";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@/lib/types";
import { createTestEvent, testMembers } from "@/test/fixtures";
import { render, screen, seedFamilyStore } from "@/test/test-utils";
import { MonthOverflowPopover } from "./month-overflow-popover";

const date = new Date(2026, 2, 8);

function setup(
  eventCount: number,
  open = true,
  eventOverrides: Partial<CalendarEvent> = {},
) {
  seedFamilyStore({ name: "Test Family", members: testMembers });
  const events = Array.from({ length: eventCount }, (_, i) =>
    createTestEvent({
      id: `e${i}`,
      title: `Event ${i}`,
      date,
      memberId: testMembers[0].id,
      ...eventOverrides,
    }),
  );
  const onEventClick = vi.fn();
  const onOpenDay = vi.fn();
  const onOpenChange = vi.fn();
  const onCloseFocus = vi.fn();

  function Harness() {
    const [isOpen, setIsOpen] = useState(open);
    return (
      <>
        <MonthOverflowPopover
          date={date}
          events={events}
          open={isOpen}
          onOpenChange={(next) => {
            onOpenChange(next);
            setIsOpen(next);
          }}
          onEventClick={onEventClick}
          onOpenDay={onOpenDay}
          onCloseFocus={onCloseFocus}
        >
          <div data-testid="anchor" tabIndex={-1}>
            anchor
          </div>
        </MonthOverflowPopover>
        <button type="button" data-testid="outside-target">
          Outside
        </button>
      </>
    );
  }

  render(<Harness />);
  return { onEventClick, onOpenDay, onOpenChange, onCloseFocus, events };
}

describe("MonthOverflowPopover", () => {
  // The global ResizeObserver mock in src/test/setup.ts isn't constructable,
  // which crashes Radix Popper's autoUpdate as soon as PopoverContent mounts.
  // Same local override already used by event-form.test.tsx and
  // time-picker.test.tsx for the same reason.
  beforeEach(() => {
    class ResizeObserverMock {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  it("lists every event for the day, not only the hidden ones", () => {
    setup(6);
    for (let i = 0; i < 6; i++) {
      expect(
        screen.getByRole("button", { name: new RegExp(`Event ${i}`) }),
      ).toBeInTheDocument();
    }
  });

  it("names the popover with the full date", () => {
    setup(6);
    const dialog = screen.getByRole("dialog", {
      name: /events for march 8, 2026/i,
    });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveClass("motion-reduce:animate-none");
  });

  it("names all-day, recurrence and multi-day state on event actions", () => {
    setup(1, true, {
      isAllDay: true,
      isRecurring: true,
      endDate: addDays(date, 4),
    });
    expect(
      screen.getByRole("button", {
        name: /Event 0, all day, John, day 1 of 5, repeats/i,
      }),
    ).toBeInTheDocument();
  });

  it("labels a stale event whose member no longer exists", () => {
    setup(1, true, { memberId: "missing-member" });
    const action = screen.getByRole("button", {
      name: /Event 0, 9:00 AM to 10:00 AM, Unknown member/i,
    });
    expect(action).toHaveTextContent("Unknown member");
  });

  it("offers an open-in-day-view action", async () => {
    const user = userEvent.setup();
    const { onOpenDay, onOpenChange, onCloseFocus } = setup(6);

    await user.click(screen.getByRole("button", { name: /open in day view/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onOpenDay).toHaveBeenCalledWith(date);
    expect(onOpenChange.mock.invocationCallOrder[0]).toBeLessThan(
      onOpenDay.mock.invocationCallOrder[0],
    );
    // Day navigation unmounts the grid; do not restore focus into it.
    expect(onCloseFocus).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the detail modal for a selected event", async () => {
    const user = userEvent.setup();
    const { onEventClick, onOpenChange, onCloseFocus } = setup(6);

    await user.click(screen.getByRole("button", { name: /Event 3/ }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick.mock.calls[0][0].title).toBe("Event 3");
    expect(onOpenChange.mock.invocationCallOrder[0]).toBeLessThan(
      onEventClick.mock.invocationCallOrder[0],
    );
    // EventDetailModal owns focus next; the popover must not fight it.
    expect(onCloseFocus).not.toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    setup(6, false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("returns focus to the anchor on Escape rather than to a trigger", async () => {
    const user = userEvent.setup();
    const { onOpenChange, onCloseFocus } = setup(6);

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Radix would otherwise focus its Trigger; this component has none, so
    // the cell must be focused explicitly via onCloseAutoFocus.
    expect(onCloseFocus).toHaveBeenCalled();
  });

  it("leaves focus on a newly clicked outside control", async () => {
    const user = userEvent.setup();
    const { onCloseFocus } = setup(6);
    const outside = screen.getByTestId("outside-target");

    await user.click(outside);

    expect(outside).toHaveFocus();
    expect(onCloseFocus).not.toHaveBeenCalled();
  });

  it("keeps dense event lists scrollable inside the bounded popover", () => {
    setup(20);
    // The list scrolls, but its ceiling is now the popover's available height
    // rather than a fixed max-h-72: with the fixed cap the content could still
    // total more than the space on either side of the anchor, and the popover
    // rendered 24px off the top of an 800px viewport. It shrinks to fit now, so
    // the list must be free to shrink with it.
    expect(screen.getByRole("list")).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-y-auto",
    );
  });
});
