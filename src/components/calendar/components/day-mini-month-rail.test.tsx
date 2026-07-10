import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import { render, renderWithUser, screen } from "@/test/test-utils";
import { DayMiniMonthRail } from "./day-mini-month-rail";

const members: FamilyMember[] = [
  { id: "m1", name: "Alice", color: "coral" },
  { id: "m2", name: "Ben", color: "teal" },
];

const ev = (date: Date, memberId: string, title = "E"): CalendarEvent => ({
  id: `${memberId}-${date.getDate()}`,
  title,
  date,
  startTime: "9:00 AM",
  endTime: "10:00 AM",
  memberId,
  isAllDay: false,
  source: "NATIVE",
});

describe("DayMiniMonthRail", () => {
  it("renders a labelled month navigator with the selected date pressed", () => {
    render(
      <DayMiniMonthRail
        currentDate={new Date(2026, 6, 15)}
        monthEvents={[ev(new Date(2026, 6, 6), "m1", "Secret Piano Lesson")]}
        members={members}
        onSelectDate={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("complementary", { name: /month navigator/i }),
    ).toBeInTheDocument();
    const selectedDate = screen.getByRole("button", {
      name: /july 15, 2026/i,
    });
    expect(selectedDate).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Secret Piano Lesson")).not.toBeInTheDocument();
  });

  it("routes a day tap through onSelectDate", async () => {
    const onSelectDate = vi.fn();
    const { user } = renderWithUser(
      <DayMiniMonthRail
        currentDate={new Date(2026, 6, 15)}
        monthEvents={[]}
        members={members}
        onSelectDate={onSelectDate}
      />,
    );

    await user.click(screen.getByRole("button", { name: /july 20, 2026/i }));
    expect(onSelectDate).toHaveBeenCalledTimes(1);
    const selected = onSelectDate.mock.calls[0][0] as Date;
    expect(selected.getFullYear()).toBe(2026);
    expect(selected.getMonth()).toBe(6);
    expect(selected.getDate()).toBe(20);
  });

  it("routes arrow keys to adjacent dates", async () => {
    const onSelectDate = vi.fn();
    const { user } = renderWithUser(
      <DayMiniMonthRail
        currentDate={new Date(2026, 6, 15)}
        monthEvents={[]}
        members={members}
        onSelectDate={onSelectDate}
      />,
    );

    screen.getByRole("button", { name: /july 15, 2026/i }).focus();
    await user.keyboard("{ArrowRight}");

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    const selected = onSelectDate.mock.calls[0][0] as Date;
    expect(selected.getFullYear()).toBe(2026);
    expect(selected.getMonth()).toBe(6);
    expect(selected.getDate()).toBe(16);
  });

  it("advances repeatedly from the selected date when arrowing after navigation", async () => {
    const onSelectDate = vi.fn();

    function StatefulRail() {
      const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 15));
      return (
        <DayMiniMonthRail
          currentDate={currentDate}
          monthEvents={[]}
          members={members}
          onSelectDate={(date) => {
            onSelectDate(date);
            setCurrentDate(date);
          }}
        />
      );
    }

    const { user } = renderWithUser(<StatefulRail />);

    screen.getByRole("button", { name: /july 15, 2026/i }).focus();
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowRight}");

    expect(onSelectDate).toHaveBeenCalledTimes(2);
    const secondSelection = onSelectDate.mock.calls[1][0] as Date;
    expect(secondSelection.getFullYear()).toBe(2026);
    expect(secondSelection.getMonth()).toBe(6);
    expect(secondSelection.getDate()).toBe(17);
  });
});
