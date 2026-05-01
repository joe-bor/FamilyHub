import { HttpResponse, http } from "msw";
import { afterEach, beforeEach } from "vitest";
import { createTestEventResponse, testMembers } from "@/test/fixtures";
import {
  API_BASE,
  resetMockEvents,
  seedMockEvents,
  server,
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

  it("keeps non-hero recurring instances visible when the hero event is virtual", async () => {
    seedMockEvents([
      createTestEventResponse({
        id: null,
        recurringEventId: "series-1",
        isRecurring: true,
        title: "Morning standup",
        date: "2026-04-25",
        startTime: "9:30 AM",
        endTime: "10:00 AM",
        memberId: testMembers[0].id,
      }),
      createTestEventResponse({
        id: null,
        recurringEventId: "series-2",
        isRecurring: true,
        title: "Doctor follow-up",
        date: "2026-04-25",
        startTime: "11:00 AM",
        endTime: "11:30 AM",
        memberId: testMembers[1].id,
      }),
    ]);

    render(<HomeDashboard nowOverride={currentDate} />);

    expect(await screen.findByText("Morning standup")).toBeInTheDocument();
    expect(screen.getByText("Doctor follow-up")).toBeInTheDocument();
  });

  it("clears stale delete errors before opening a different event detail", async () => {
    setViewportWidth(1024);
    server.use(
      http.delete(`${API_BASE}/calendar/events/:id`, () =>
        HttpResponse.json({ message: "Delete failed" }, { status: 500 }),
      ),
    );
    seedMockEvents([
      createTestEventResponse({
        id: "event-breakfast",
        title: "Breakfast",
        date: "2026-04-25",
        startTime: "8:00 AM",
        endTime: "9:00 AM",
        memberId: testMembers[0].id,
      }),
      createTestEventResponse({
        id: "event-pickup",
        title: "School pickup",
        date: "2026-04-25",
        startTime: "10:00 AM",
        endTime: "11:00 AM",
        memberId: testMembers[1].id,
      }),
    ]);

    const { user } = renderWithUser(
      <HomeDashboard nowOverride={new Date(2026, 3, 25, 12, 0, 0, 0)} />,
    );

    await screen.findByText("Breakfast");

    await user.click(screen.getByRole("button", { name: /breakfast/i }));
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    await user.click(screen.getByRole("button", { name: /delete event/i }));

    expect(
      await screen.findByText("Failed to delete event. Please try again."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close/i }));
    await user.click(screen.getByRole("button", { name: /school pickup/i }));

    expect(
      screen.queryByText("Failed to delete event. Please try again."),
    ).not.toBeInTheDocument();
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
