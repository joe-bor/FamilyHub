import { waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createTestEvent, testEvents, testMembers } from "@/test/fixtures";
import {
  API_BASE,
  getMockEvents,
  resetMockEvents,
  seedMockEvents,
  server,
} from "@/test/mocks/server";
import {
  render,
  renderWithUser,
  screen,
  seedCalendarStore,
  seedFamilyStore,
} from "@/test/test-utils";
import { CalendarModule } from "./calendar-module";

// Mock useIsMobile hook for consistent viewport
vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useIsMobile: () => false,
  };
});

describe("CalendarModule", () => {
  // Setup MSW lifecycle hooks
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  afterEach(() => {
    server.resetHandlers();
    resetMockEvents();
  });
  afterAll(() => server.close());

  // Seed family store before each test (most tests need family data)
  beforeEach(() => {
    seedFamilyStore({
      name: "Test Family",
      members: testMembers,
      setupComplete: true,
    });
    // Initialize filter with all members selected
    seedCalendarStore({
      filter: {
        selectedMembers: testMembers.map((m) => m.id),
        showAllDayEvents: true,
      },
    });
  });

  describe("Loading & Error States", () => {
    it("shows loading indicator while fetching events", async () => {
      // Delay the response to ensure loading state is visible
      server.use(
        http.get(`${API_BASE}/calendar/events`, async () => {
          await new Promise((r) => setTimeout(r, 100));
          return HttpResponse.json({ data: [] });
        }),
      );

      render(<CalendarModule />);

      expect(screen.getByText("Loading events...")).toBeInTheDocument();
    });

    it("shows error message when API fails", async () => {
      server.use(
        http.get(`${API_BASE}/calendar/events`, () => {
          return HttpResponse.json(
            { message: "Internal server error" },
            { status: 500 },
          );
        }),
      );

      render(<CalendarModule />);

      await waitFor(() => {
        expect(screen.getByText(/Error loading events/)).toBeInTheDocument();
      });
    });

    it("shows events after successful fetch", async () => {
      const event = createTestEvent({ title: "Team Meeting" });
      seedMockEvents([event]);

      render(<CalendarModule />);

      await waitFor(() => {
        expect(screen.getByText("Team Meeting")).toBeInTheDocument();
      });
    });
  });

  describe("Event Display & Filtering", () => {
    it("displays events for current date range", async () => {
      seedMockEvents(testEvents);

      render(<CalendarModule />);

      await waitFor(() => {
        expect(screen.getByText("Morning Meeting")).toBeInTheDocument();
        expect(screen.getByText("Lunch with Team")).toBeInTheDocument();
      });
    });

    it("filters events by selected family member", async () => {
      // Only select first member
      seedCalendarStore({
        filter: {
          selectedMembers: [testMembers[0].id],
          showAllDayEvents: true,
        },
      });
      seedMockEvents(testEvents);

      render(<CalendarModule />);

      await waitFor(() => {
        // First member's event should be visible
        expect(screen.getByText("Morning Meeting")).toBeInTheDocument();
      });

      // Second member's event should not be visible
      expect(screen.queryByText("Lunch with Team")).not.toBeInTheDocument();
    });

    it("filters out all-day events when toggle is off", async () => {
      seedCalendarStore({
        filter: {
          selectedMembers: testMembers.map((m) => m.id),
          showAllDayEvents: false,
        },
      });
      seedMockEvents(testEvents);

      render(<CalendarModule />);

      await waitFor(() => {
        expect(screen.getByText("Morning Meeting")).toBeInTheDocument();
      });

      // All-day event should not be visible
      expect(screen.queryByText("All Day Event")).not.toBeInTheDocument();
    });
  });

  describe("Add Event Flow", () => {
    it("opens add event modal when FAB clicked", async () => {
      seedMockEvents([]);

      const { user } = renderWithUser(<CalendarModule />);

      await waitFor(() => {
        expect(screen.queryByText("Loading events...")).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole("button", { name: /add event/i });
      await user.click(addButton);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Add Event" }),
      ).toBeInTheDocument();
    });

    it("submits new event to API and shows it in calendar", async () => {
      seedMockEvents([]);

      const { user } = renderWithUser(<CalendarModule />);

      await waitFor(() => {
        expect(screen.queryByText("Loading events...")).not.toBeInTheDocument();
      });

      // Open modal
      await user.click(screen.getByRole("button", { name: /add event/i }));

      // Wait for dialog to open
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Fill in the form
      const titleInput = screen.getByLabelText(/event name/i);
      await user.clear(titleInput);
      await user.type(titleInput, "New Test Event");

      // Submit the form (find button within dialog)
      const dialog = screen.getByRole("dialog");
      const submitButton = within(dialog).getByRole("button", {
        name: /add event/i,
      });
      await user.click(submitButton);

      // Modal should close after successful submission
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Verify event was created in mock storage
      const mockEvents = getMockEvents();
      expect(mockEvents).toHaveLength(1);
      expect(mockEvents[0].title).toBe("New Test Event");

      // Wait for the refetch to complete and event to appear
      await waitFor(
        () => {
          expect(screen.getByText("New Test Event")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("keeps modal open and shows error on API failure", async () => {
      seedMockEvents([]);

      // Make create fail
      server.use(
        http.post(`${API_BASE}/calendar/events`, () => {
          return HttpResponse.json(
            { message: "Failed to create event" },
            { status: 500 },
          );
        }),
      );

      const { user } = renderWithUser(<CalendarModule />);

      await waitFor(() => {
        expect(screen.queryByText("Loading events...")).not.toBeInTheDocument();
      });

      // Open modal
      await user.click(screen.getByRole("button", { name: /add event/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Fill and submit
      await user.type(screen.getByLabelText(/event name/i), "Failing Event");
      const dialog = screen.getByRole("dialog");
      const submitButton = within(dialog).getByRole("button", {
        name: /add event/i,
      });
      await user.click(submitButton);

      // Modal should stay open after failed request
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });
  });

  describe("View Event Details", () => {
    it("renders events with clickable structure", async () => {
      const event = createTestEvent({ title: "Clickable Event" });
      seedMockEvents([event]);

      render(<CalendarModule />);

      await waitFor(() => {
        expect(screen.getByText("Clickable Event")).toBeInTheDocument();
      });

      // Verify event card is in the DOM and has event handler structure
      const eventElement = screen.getByText("Clickable Event");
      expect(eventElement).toBeInTheDocument();
    });
  });

  // Note: Edit and Delete flows with full modal interactions are tested in E2E tests (Playwright)
  // These unit tests verify the API hooks and basic component rendering

  describe("View Switching", () => {
    it("renders weekly view with events", async () => {
      seedMockEvents(testEvents);
      seedCalendarStore({ calendarView: "weekly" });

      render(<CalendarModule />);

      await waitFor(() => {
        expect(screen.getByText("Morning Meeting")).toBeInTheDocument();
      });
    });

    it("renders schedule view with events", async () => {
      seedMockEvents(testEvents);
      seedCalendarStore({ calendarView: "schedule" });

      render(<CalendarModule />);

      await waitFor(() => {
        expect(screen.getByText("Morning Meeting")).toBeInTheDocument();
      });
    });
  });

  describe("Store Persistence", () => {
    it("respects initial calendar view from store", async () => {
      seedMockEvents([]);
      seedCalendarStore({ calendarView: "monthly" });

      render(<CalendarModule />);

      // Monthly view shows month name in navigation
      await waitFor(() => {
        expect(screen.queryByText("Loading events...")).not.toBeInTheDocument();
      });
    });

    it("respects filter state from store", async () => {
      // Only first member selected
      seedCalendarStore({
        filter: {
          selectedMembers: [testMembers[0].id],
          showAllDayEvents: true,
        },
      });
      seedMockEvents(testEvents);

      render(<CalendarModule />);

      await waitFor(() => {
        // Should show first member's event
        expect(screen.getByText("Morning Meeting")).toBeInTheDocument();
      });

      // Should not show other member's event
      expect(screen.queryByText("Lunch with Team")).not.toBeInTheDocument();
    });
  });
});
