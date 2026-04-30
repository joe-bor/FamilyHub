import { afterEach, beforeEach } from "vitest";
import { createTestEventResponse, testMembers } from "@/test/fixtures";
import {
  resetMockEvents,
  seedMockEvents,
  setupMswServer,
} from "@/test/mocks/server";
import {
  render,
  renderWithUser,
  screen,
  seedFamilyStore,
  waitForMemberSelected,
} from "@/test/test-utils";
import { HomeDashboard } from "./home-dashboard";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });

  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: (() => {
      const maxWidth = Number.parseInt(
        query.match(/max-width:\s*(\d+)px/)?.[1] ?? "",
        10,
      );
      const minWidth = Number.parseInt(
        query.match(/min-width:\s*(\d+)px/)?.[1] ?? "",
        10,
      );

      const matchesMax = Number.isNaN(maxWidth) || width <= maxWidth;
      const matchesMin = Number.isNaN(minWidth) || width >= minWidth;
      return matchesMax && matchesMin;
    })(),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("HomeDashboard", () => {
  setupMswServer();
  const currentDate = new Date(2026, 3, 25, 9, 0, 0, 0);

  beforeEach(() => {
    setViewportWidth(768);
    seedFamilyStore({
      name: "Test Family",
      members: testMembers,
    });
  });

  afterEach(() => {
    resetMockEvents();
  });

  it("renders the mobile dashboard surface instead of the launcher grid", async () => {
    seedMockEvents([
      createTestEventResponse({
        id: "today",
        title: "School pickup",
        date: "2026-04-25",
        startTime: "9:45 AM",
        endTime: "10:15 AM",
        memberId: testMembers[0].id,
      }),
      createTestEventResponse({
        id: "tomorrow",
        title: "Dentist",
        date: "2026-04-26",
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        memberId: testMembers[1].id,
      }),
    ]);

    render(<HomeDashboard nowOverride={currentDate} />);

    expect(
      await screen.findByText("Good morning, Test Family"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Up next · in 45 min")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Focus on John's events" }),
    ).toBeInTheDocument();
    expect(screen.getByText("School pickup")).toBeInTheDocument();
    expect(screen.getByText("Coming up")).toBeInTheDocument();
    expect(
      screen.queryByText("What would you like to do?"),
    ).not.toBeInTheDocument();
  });

  it("renders the calm empty state without any Google connect CTA", async () => {
    seedMockEvents([]);

    render(<HomeDashboard nowOverride={currentDate} />);

    expect(
      await screen.findByText("Nothing on the calendar today"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /connect google calendar/i }),
    ).not.toBeInTheDocument();
  });

  it("filters hero, today, and coming up when a member chip is focused", async () => {
    seedMockEvents([
      createTestEventResponse({
        id: "john-today",
        title: "John event",
        date: "2026-04-25",
        startTime: "9:30 AM",
        endTime: "10:00 AM",
        memberId: testMembers[0].id,
      }),
      createTestEventResponse({
        id: "jane-today",
        title: "Jane event",
        date: "2026-04-25",
        startTime: "11:00 AM",
        endTime: "12:00 PM",
        memberId: testMembers[1].id,
      }),
      createTestEventResponse({
        id: "john-tomorrow",
        title: "John tomorrow",
        date: "2026-04-26",
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        memberId: testMembers[0].id,
      }),
      createTestEventResponse({
        id: "jane-tomorrow",
        title: "Jane tomorrow",
        date: "2026-04-26",
        startTime: "2:00 PM",
        endTime: "3:00 PM",
        memberId: testMembers[1].id,
      }),
    ]);

    const { user } = renderWithUser(
      <HomeDashboard nowOverride={currentDate} />,
    );

    await screen.findByText("John event");
    await user.click(
      screen.getByRole("button", { name: "Focus on Jane's events" }),
    );

    expect(screen.getByText("Jane event")).toBeInTheDocument();
    expect(screen.getByText("Jane tomorrow")).toBeInTheDocument();
    expect(screen.queryByText("John event")).not.toBeInTheDocument();
    expect(screen.queryByText("John tomorrow")).not.toBeInTheDocument();
    expect(screen.getByText("Up next · in 2 hrs")).toBeInTheDocument();
  });

  it("opens the reused add-event flow prefilled for the focused member and today", async () => {
    seedMockEvents([]);

    const { user } = renderWithUser(
      <HomeDashboard nowOverride={currentDate} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Focus on Jane's events" }),
    );
    await user.click(screen.getByRole("button", { name: /add event/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await waitForMemberSelected("Jane");
    expect(
      screen.getByRole("button", { name: /april 25th, 2026/i }),
    ).toBeInTheDocument();
  });
});
