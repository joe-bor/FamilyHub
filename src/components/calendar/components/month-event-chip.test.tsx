import { describe, expect, it } from "vitest";
import { colorMap } from "@/lib/types";
import { createTestEvent, testMembers } from "@/test/fixtures";
import { render, screen, seedFamilyStore } from "@/test/test-utils";
import { MonthEventChip } from "./month-event-chip";

const event = createTestEvent({
  id: "trip",
  title: "Spring break",
  memberId: "missing-member",
});

function relativeLuminance(hex: string): number {
  const channels = hex.match(/[0-9a-f]{2}/gi);
  if (!channels || channels.length !== 3)
    throw new Error(`Invalid hex: ${hex}`);
  const [red, green, blue] = channels.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("MonthEventChip", () => {
  it("is visual content rather than a nested control", () => {
    render(
      <MonthEventChip
        event={event}
        edge="solo"
        weldLeft={false}
        weldRight={false}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByTestId("month-event-chip")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("expands its box by the exact left and right weld", () => {
    render(<MonthEventChip event={event} edge="middle" weldLeft weldRight />);
    expect(screen.getByTestId("month-event-chip")).toHaveStyle({
      height: "28px",
      minHeight: "28px",
      marginLeft: "-9px",
      width: "calc(100% + 18px)",
    });
  });

  it("suppresses outward bleed at a row edge", () => {
    render(
      <MonthEventChip event={event} edge="middle" weldLeft={false} weldRight />,
    );
    expect(screen.getByTestId("month-event-chip")).toHaveStyle({
      marginLeft: "0px",
      width: "calc(100% + 9px)",
    });
  });

  it("rounds only the true start and end of a run", () => {
    const cases = [
      ["solo", "rounded"],
      ["start", "rounded-l"],
      ["end", "rounded-r"],
    ] as const;
    for (const [edge, expected] of cases) {
      const { unmount } = render(
        <MonthEventChip
          event={event}
          edge={edge}
          weldLeft={false}
          weldRight={false}
        />,
      );
      expect(screen.getByTestId("month-event-chip")).toHaveClass(expected);
      unmount();
    }
    render(
      <MonthEventChip
        event={event}
        edge="middle"
        weldLeft={false}
        weldRight={false}
      />,
    );
    expect(screen.getByTestId("month-event-chip").className).not.toMatch(
      /rounded/,
    );
  });

  it("clamps to exactly one 28px line so slot capacity cannot over-report", () => {
    // monthSlotCapacity divides the cell's usable height by MONTH_CHIP_HEIGHT
    // as an EXACT slot height. A chip that wrapped to two lines would make
    // capacity over-report and overflow the cell.
    render(
      <MonthEventChip
        event={{
          ...event,
          title:
            "Extremely long multi-day family road trip title that would wrap",
        }}
        edge="solo"
        weldLeft={false}
        weldRight={false}
      />,
    );
    const chip = screen.getByTestId("month-event-chip");
    expect(chip).toHaveStyle({ height: "28px", maxHeight: "28px" });
    expect(chip).toHaveClass("overflow-hidden", "whitespace-nowrap");
  });

  it("uses foreground text on the light missing-member fallback", () => {
    render(
      <MonthEventChip
        event={event}
        edge="solo"
        weldLeft={false}
        weldRight={false}
      />,
    );
    const chip = screen.getByTestId("month-event-chip");
    expect(chip).toHaveClass("bg-muted", "text-foreground", "shrink-0");
    expect(chip).not.toHaveClass("text-white");
    expect(chip).toHaveTextContent(/Unknown.*Spring break/);
  });

  it.each(
    Object.entries(colorMap),
  )("%s solid member background meets AA with white text", (_name, colors) => {
    expect(contrastRatio("#ffffff", colors.hex)).toBeGreaterThanOrEqual(4.5);
  });

  it("renders all-day and recurrence markers as visual content", () => {
    render(
      <MonthEventChip
        event={{ ...event, isAllDay: true, isRecurring: true }}
        edge="solo"
        weldLeft={false}
        weldRight={false}
      />,
    );
    expect(screen.getByTestId("month-all-day-marker")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByTestId("month-all-day-marker")).toHaveClass(
      "bg-current",
    );
    expect(screen.getByTestId("month-all-day-marker").className).not.toMatch(
      /opacity/,
    );
    expect(screen.getByTestId("month-recurring-marker")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("shows the member name so colour is not the only visible identity cue", () => {
    const namedMember = { ...testMembers[0], name: "John Smith" };
    seedFamilyStore({ name: "Test Family", members: [namedMember] });
    render(
      <MonthEventChip
        event={{ ...event, memberId: namedMember.id }}
        edge="solo"
        weldLeft={false}
        weldRight={false}
      />,
    );
    expect(screen.getByTestId("month-chip-member")).toHaveTextContent("John");
    expect(screen.getByTestId("month-chip-member")).not.toHaveTextContent(
      "Smith",
    );
  });
});
