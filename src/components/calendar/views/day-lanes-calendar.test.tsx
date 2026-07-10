import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import {
  render,
  renderWithUser,
  screen,
  seedFamilyStore,
  within,
} from "@/test/test-utils";
import { DayLanesCalendar } from "./day-lanes-calendar";

const members: FamilyMember[] = [
  { id: "m1", name: "Alice", color: "coral" },
  { id: "m2", name: "Ben", color: "teal" },
];

const sixMembers: FamilyMember[] = [
  { id: "m1", name: "Alice", color: "coral" },
  { id: "m2", name: "Ben", color: "teal" },
  { id: "m3", name: "Cara", color: "green" },
  { id: "m4", name: "Dev", color: "purple" },
  { id: "m5", name: "Eli", color: "yellow" },
  { id: "m6", name: "Fran", color: "pink" },
];

const base = {
  date: new Date(2026, 6, 6),
  source: "NATIVE" as const,
  isAllDay: false,
};

const events: CalendarEvent[] = [
  {
    ...base,
    id: "a",
    title: "Swim",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
    memberId: "m1",
  },
  {
    ...base,
    id: "b",
    title: "Soccer",
    startTime: "11:00 AM",
    endTime: "12:00 PM",
    memberId: "m2",
  },
  {
    ...base,
    id: "c",
    title: "Camp week",
    startTime: "12:00 AM",
    endTime: "12:00 AM",
    memberId: "m1",
    isAllDay: true,
  },
];

const noopFilter = {
  selectedMembers: ["m1", "m2"],
  showAllDayEvents: true,
};

describe("DayLanesCalendar", () => {
  beforeEach(() => {
    seedFamilyStore({ name: "Test Family", members });
  });

  function mockReducedMotion(matches: boolean) {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  it("renders one labelled lane per member in family order", () => {
    render(
      <DayLanesCalendar
        events={events}
        currentDate={new Date(2026, 6, 6)}
        members={members}
        filter={noopFilter}
        showRail={false}
        onEventClick={vi.fn()}
        onSelectDate={vi.fn()}
      />,
    );

    const alice = screen.getByRole("group", { name: /alice's schedule/i });
    const ben = screen.getByRole("group", { name: /ben's schedule/i });
    expect(alice).toBeInTheDocument();
    expect(ben).toBeInTheDocument();
    expect(within(alice).getByText("Swim")).toBeInTheDocument();
    expect(within(ben).getByText("Soccer")).toBeInTheDocument();
  });

  it("uses shrinkable lane tracks so six members fit without horizontal scroll", () => {
    render(
      <DayLanesCalendar
        events={[]}
        currentDate={new Date(2026, 6, 6)}
        members={sixMembers}
        filter={{
          selectedMembers: sixMembers.map((member) => member.id),
          showAllDayEvents: true,
        }}
        showRail={false}
        onEventClick={vi.fn()}
        onSelectDate={vi.fn()}
      />,
    );

    expect(screen.getByTestId("day-lanes-grid")).toHaveStyle({
      gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    });
  });

  it("positions three overlapping events in distinct visible columns", () => {
    const overlappingEvents: CalendarEvent[] = [
      {
        ...base,
        id: "overlap-a",
        title: "Overlap A",
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        memberId: "m1",
      },
      {
        ...base,
        id: "overlap-b",
        title: "Overlap B",
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        memberId: "m1",
      },
      {
        ...base,
        id: "overlap-c",
        title: "Overlap C",
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        memberId: "m1",
      },
    ];

    render(
      <DayLanesCalendar
        events={overlappingEvents}
        currentDate={new Date(2026, 6, 6)}
        members={members}
        filter={noopFilter}
        showRail={false}
        onEventClick={vi.fn()}
        onSelectDate={vi.fn()}
      />,
    );

    const leftPositions = screen
      .getAllByTestId("day-lane-event")
      .map((event) => event.style.left);
    expect(leftPositions).toContain("calc(0% + 6px)");
    expect(leftPositions.some((left) => left.startsWith("calc(33.333"))).toBe(
      true,
    );
    expect(leftPositions.some((left) => left.startsWith("calc(66.666"))).toBe(
      true,
    );
  });

  it("renders all-day chips in the band aligned under the owning member", () => {
    render(
      <DayLanesCalendar
        events={events}
        currentDate={new Date(2026, 6, 6)}
        members={members}
        filter={noopFilter}
        showRail={false}
        onEventClick={vi.fn()}
        onSelectDate={vi.fn()}
      />,
    );

    const band = screen.getByRole("group", { name: /all-day events/i });
    expect(
      within(band).getByRole("button", { name: /camp week/i }),
    ).toBeInTheDocument();
  });

  it("routes lane event taps through onEventClick", async () => {
    const onEventClick = vi.fn();
    const { user } = renderWithUser(
      <DayLanesCalendar
        events={events}
        currentDate={new Date(2026, 6, 6)}
        members={members}
        filter={noopFilter}
        showRail={false}
        onEventClick={onEventClick}
        onSelectDate={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Swim"));
    expect(onEventClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a" }),
    );
  });

  it("routes all-day chip taps through onEventClick", async () => {
    const onEventClick = vi.fn();
    const { user } = renderWithUser(
      <DayLanesCalendar
        events={events}
        currentDate={new Date(2026, 6, 6)}
        members={members}
        filter={noopFilter}
        showRail={false}
        onEventClick={onEventClick}
        onSelectDate={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /camp week/i }));
    expect(onEventClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c" }),
    );
  });

  it("does not render the rail when showRail is false", () => {
    render(
      <DayLanesCalendar
        events={events}
        currentDate={new Date(2026, 6, 6)}
        members={members}
        filter={noopFilter}
        showRail={false}
        onEventClick={vi.fn()}
        onSelectDate={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("complementary", { name: /month navigator/i }),
    ).not.toBeInTheDocument();
  });

  it("uses instant auto-scroll when reduced motion is requested", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 6, 10, 0, 0));
    mockReducedMotion(true);

    render(
      <DayLanesCalendar
        events={events}
        currentDate={new Date(2026, 6, 6)}
        members={members}
        filter={noopFilter}
        showRail={false}
        onEventClick={vi.fn()}
        onSelectDate={vi.fn()}
      />,
    );

    expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
      top: 8,
      behavior: "auto",
    });
  });
});
