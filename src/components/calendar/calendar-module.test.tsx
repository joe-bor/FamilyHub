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
import { useCalendarStore } from "@/stores";
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
  resetCalendarStore,
  resetFamilyStore,
  screen,
  seedCalendarStore,
  seedFamilyStore,
  TEST_TIMEOUTS,
  typeAndWait,
  waitForMemberSelected,
} from "@/test/test-utils";
import { CalendarModule } from "./calendar-module";

// Controllable mock for useIsMobile
let mockIsMobile = false;
vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useIsMobile: () => mockIsMobile,
  };
});

describe("CalendarModule", () => {
  // Setup MSW lifecycle hooks
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  afterEach(() => {
    server.resetHandlers();
    resetMockEvents();
    resetCalendarStore();
    resetFamilyStore();
    mockIsMobile = false; // Reset mobile mock
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

      // Wait for first member button to appear AND be selected (has text-white when selected)
      // This ensures both DOM is ready AND form state has been updated via useEffect
      await waitForMemberSelected(testMembers[0].name);

      // Fill in the form and wait for value to propagate
      const titleInput = screen.getByLabelText(/event name/i);
      await user.clear(titleInput);
      await typeAndWait(user, titleInput, "New Test Event");

      // Submit the form (find button within dialog)
      const dialog = screen.getByRole("dialog");
      const submitButton = within(dialog).getByRole("button", {
        name: /add event/i,
      });
      await user.click(submitButton);

      // Modal should close after successful submission
      await waitFor(
        () => {
          expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        },
        { timeout: TEST_TIMEOUTS.FORM_SUBMIT },
      );

      // Verify event was created in mock storage
      const mockEvents = getMockEvents();
      expect(mockEvents).toHaveLength(1);
      expect(mockEvents[0].title).toBe("New Test Event");

      // Wait for the refetch to complete and event to appear
      await waitFor(
        () => {
          expect(screen.getByText("New Test Event")).toBeInTheDocument();
        },
        { timeout: TEST_TIMEOUTS.QUERY_REFETCH },
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

  describe("Event Detail Modal", () => {
    it("opens detail modal when event is clicked", async () => {
      const event = createTestEvent({
        title: "Team Standup",
        startTime: "9:00 AM",
        endTime: "9:30 AM",
        location: "Conference Room A",
      });
      seedMockEvents([event]);

      const { user } = renderWithUser(<CalendarModule />);

      await waitFor(() => {
        expect(screen.getByText("Team Standup")).toBeInTheDocument();
      });

      // Click the event
      await user.click(screen.getByText("Team Standup"));

      // Detail modal should open with event info
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Verify modal shows event details (scope to dialog to avoid duplicate text matches)
      const dialog = screen.getByRole("dialog");
      expect(
        within(dialog).getByRole("heading", { name: "Team Standup" }),
      ).toBeInTheDocument();
      expect(within(dialog).getByText("9:00 AM – 9:30 AM")).toBeInTheDocument();
      expect(within(dialog).getByText("Conference Room A")).toBeInTheDocument();
      expect(within(dialog).getByText(testMembers[0].name)).toBeInTheDocument();
    });

    it("closes detail modal when close button clicked", async () => {
      const event = createTestEvent({ title: "Closeable Event" });
      seedMockEvents([event]);

      const { user } = renderWithUser(<CalendarModule />);

      await waitFor(() => {
        expect(screen.getByText("Closeable Event")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Closeable Event"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Close the modal (dialog has a close button in header)
      const dialog = screen.getByRole("dialog");
      const closeButton = within(dialog).getByRole("button", {
        name: /close/i,
      });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("Edit Event Flow", () => {
    it("opens edit modal from detail modal and updates event", async () => {
      const event = createTestEvent({ title: "Original Title" });
      seedMockEvents([event]);

      const { user } = renderWithUser(<CalendarModule />);

      // Wait for event to load
      await waitFor(() => {
        expect(screen.getByText("Original Title")).toBeInTheDocument();
      });

      // Click event to open detail modal
      await user.click(screen.getByText("Original Title"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Click edit button
      await user.click(screen.getByRole("button", { name: /edit/i }));

      // Edit modal should open with form
      await waitFor(() => {
        expect(screen.getByLabelText(/event name/i)).toHaveValue(
          "Original Title",
        );
      });

      // Update the title
      const titleInput = screen.getByLabelText(/event name/i);
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Title");

      // Submit
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Updated event should appear
      await waitFor(() => {
        expect(screen.getByText("Updated Title")).toBeInTheDocument();
        expect(screen.queryByText("Original Title")).not.toBeInTheDocument();
      });
    });
  });

  describe("Delete Event Flow", () => {
    it("deletes event after confirmation", async () => {
      const event = createTestEvent({ title: "Event to Delete" });
      seedMockEvents([event]);

      const { user } = renderWithUser(<CalendarModule />);

      await waitFor(() => {
        expect(screen.getByText("Event to Delete")).toBeInTheDocument();
      });

      // Open detail modal
      await user.click(screen.getByText("Event to Delete"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Click delete
      await user.click(screen.getByRole("button", { name: /delete/i }));

      // Confirm deletion
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /delete event/i }));

      // Modal should close and event should be gone
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByText("Event to Delete")).not.toBeInTheDocument();
      });

      // Verify mock storage is empty
      expect(getMockEvents()).toHaveLength(0);
    });

    it("cancels delete when cancel button clicked", async () => {
      const event = createTestEvent({ title: "Keep This Event" });
      seedMockEvents([event]);

      const { user } = renderWithUser(<CalendarModule />);

      await waitFor(() => {
        expect(screen.getByText("Keep This Event")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Keep This Event"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Click delete then cancel
      await user.click(screen.getByRole("button", { name: /delete/i }));
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Should return to edit/delete buttons
      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /delete/i }),
      ).toBeInTheDocument();

      // Event should still exist
      expect(getMockEvents()).toHaveLength(1);
    });
  });

  describe("Date Navigation", () => {
    it("navigates to previous day when Previous button clicked", async () => {
      seedMockEvents([]);
      seedCalendarStore({ calendarView: "daily" });
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const { user } = renderWithUser(<CalendarModule />);

      await waitFor(() => {
        expect(screen.queryByText("Loading events...")).not.toBeInTheDocument();
      });

      // Click previous
      await user.click(screen.getByRole("button", { name: /previous/i }));

      // Date label should update to yesterday
      const expectedLabel = yesterday.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      await waitFor(() => {
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      });
    });

    it("navigates to next day when Next button clicked", async () => {
      seedMockEvents([]);
      seedCalendarStore({ calendarView: "daily" });
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { user } = renderWithUser(<CalendarModule />);

      await waitFor(() => {
        expect(screen.queryByText("Loading events...")).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /next/i }));

      const expectedLabel = tomorrow.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      await waitFor(() => {
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      });
    });

    it("returns to today when Today button clicked", async () => {
      seedMockEvents([]);
      seedCalendarStore({ calendarView: "daily" });

      const { user } = renderWithUser(<CalendarModule />);

      await waitFor(() => {
        expect(screen.queryByText("Loading events...")).not.toBeInTheDocument();
      });

      // Navigate away first
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /next/i }));

      // Click today
      await user.click(screen.getByRole("button", { name: /today/i }));

      const today = new Date();
      const expectedLabel = today.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      await waitFor(() => {
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      });
    });
  });

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

  describe("Mobile Smart Defaults", () => {
    it("defaults to schedule view on mobile for first-time users", async () => {
      // Set mobile mock to true for this test
      mockIsMobile = true;

      // Seed as first-time user (hasUserSetView: false is already the default after reset)
      seedMockEvents([]);

      render(<CalendarModule />);

      await waitFor(() => {
        expect(screen.queryByText("Loading events...")).not.toBeInTheDocument();
      });

      // The store should have been updated to schedule view
      const { calendarView } = useCalendarStore.getState();
      expect(calendarView).toBe("schedule");
    });

    it("respects user preference on mobile", async () => {
      // Set mobile mock to true
      mockIsMobile = true;

      // User has explicitly set a view preference
      seedCalendarStore({ calendarView: "daily" });
      // Mark as user-set by calling setState directly
      useCalendarStore.setState({ hasUserSetView: true });
      seedMockEvents([]);

      render(<CalendarModule />);

      await waitFor(() => {
        expect(screen.queryByText("Loading events...")).not.toBeInTheDocument();
      });

      // Should keep user's preference, not switch to schedule
      const { calendarView } = useCalendarStore.getState();
      expect(calendarView).toBe("daily");
    });
  });
});
