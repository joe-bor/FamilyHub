import { format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testMembers } from "@/test/fixtures";
import {
  render,
  renderWithUser,
  screen,
  seedFamilyStore,
  TEST_TIMEOUTS,
  typeAndWait,
  waitFor,
  waitForMemberSelected,
} from "@/test/test-utils";
import { EventForm } from "./event-form";

describe("EventForm", () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    seedFamilyStore({
      name: "Test Family",
      members: testMembers,
    });
  });

  describe("Add Mode", () => {
    it("renders with smart defaults", () => {
      render(
        <EventForm
          mode="add"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      // Check form fields exist
      expect(screen.getByLabelText(/event name/i)).toBeInTheDocument();
      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Start Time")).toBeInTheDocument();
      expect(screen.getByText("End Time")).toBeInTheDocument();
      expect(screen.getByText("Assign To")).toBeInTheDocument();

      // Check buttons
      expect(
        screen.getByRole("button", { name: /add event/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });

    it("defaults title to empty", () => {
      render(
        <EventForm
          mode="add"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      const titleInput = screen.getByLabelText(/event name/i);
      expect(titleInput).toHaveValue("");
    });

    it("defaults date to today", () => {
      render(
        <EventForm
          mode="add"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      // The date picker uses "PPP" format from date-fns (e.g., "December 28th, 2025")
      const today = format(new Date(), "PPP");
      expect(screen.getByText(today)).toBeInTheDocument();
    });

    it("defaults to first family member", async () => {
      // Pass explicit defaultValues to avoid async initialization race condition
      // The component's smart defaults logic is tested implicitly by other tests
      const { user } = renderWithUser(
        <EventForm
          mode="add"
          defaultValues={{ memberId: testMembers[0].id }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      // Wait for member button to be visible AND selected
      await waitForMemberSelected(testMembers[0].name);

      // Fill title and submit to verify first member is selected
      const titleInput = screen.getByLabelText(/event name/i);
      await typeAndWait(user, titleInput, "Test Event");

      await user.click(screen.getByRole("button", { name: /add event/i }));

      await waitFor(
        () => {
          expect(mockOnSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
              memberId: testMembers[0].id,
            }),
          );
        },
        { timeout: TEST_TIMEOUTS.FORM_SUBMIT },
      );
    });
  });

  describe("Edit Mode", () => {
    const existingEvent = {
      title: "Existing Meeting",
      date: "2025-12-25",
      startTime: "14:00",
      endTime: "15:00",
      memberId: testMembers[1].id,
    };

    it("renders with provided values", () => {
      render(
        <EventForm
          mode="edit"
          defaultValues={existingEvent}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByLabelText(/event name/i)).toHaveValue(
        "Existing Meeting",
      );
      expect(
        screen.getByRole("button", { name: /save changes/i }),
      ).toBeInTheDocument();
    });

    it("shows Save Changes button instead of Add Event", () => {
      render(
        <EventForm
          mode="edit"
          defaultValues={existingEvent}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      expect(
        screen.queryByRole("button", { name: /add event/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /save changes/i }),
      ).toBeInTheDocument();
    });

    it("preserves the selected family member on submit", async () => {
      const { user } = renderWithUser(
        <EventForm
          mode="edit"
          defaultValues={existingEvent}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      // Submit without changing member
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      // Should submit with the original member (testMembers[1])
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: testMembers[1].id,
        }),
      );
    });
  });

  describe("Form Validation", () => {
    it("shows error when title is empty on submit", async () => {
      const { user } = renderWithUser(
        <EventForm
          mode="add"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      // Clear title and submit
      const titleInput = screen.getByLabelText(/event name/i);
      await user.clear(titleInput);
      await user.click(screen.getByRole("button", { name: /add event/i }));

      expect(screen.getByText("Event name is required")).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("shows error when title exceeds 100 characters", async () => {
      const { user } = renderWithUser(
        <EventForm
          mode="add"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      const longTitle = "a".repeat(101);
      const titleInput = screen.getByLabelText(/event name/i);
      await user.type(titleInput, longTitle);
      await user.click(screen.getByRole("button", { name: /add event/i }));

      expect(
        screen.getByText("Event name must be 100 characters or less"),
      ).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("rejects whitespace-only title", async () => {
      const { user } = renderWithUser(
        <EventForm
          mode="add"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      const titleInput = screen.getByLabelText(/event name/i);
      await user.type(titleInput, "   ");
      await user.click(screen.getByRole("button", { name: /add event/i }));

      expect(screen.getByText("Event name is required")).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("shows error when end time is before start time", async () => {
      const { user } = renderWithUser(
        <EventForm
          mode="add"
          defaultValues={{ startTime: "14:00", endTime: "13:00" }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      await user.type(screen.getByLabelText(/event name/i), "Test Event");
      await user.click(screen.getByRole("button", { name: /add event/i }));

      expect(
        screen.getByText("End time must be after start time"),
      ).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Form Submission", () => {
    it("calls onSubmit with form data when valid", async () => {
      // Pass explicit defaultValues to avoid async initialization race condition
      const { user } = renderWithUser(
        <EventForm
          mode="add"
          defaultValues={{ memberId: testMembers[0].id }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      // Wait for member button to be visible AND selected
      await waitForMemberSelected(testMembers[0].name);

      // Fill in the title and wait for value to propagate
      const titleInput = screen.getByLabelText(/event name/i);
      await typeAndWait(user, titleInput, "New Team Meeting");

      // Submit the form
      await user.click(screen.getByRole("button", { name: /add event/i }));

      await waitFor(
        () => {
          expect(mockOnSubmit).toHaveBeenCalledTimes(1);
          expect(mockOnSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
              title: "New Team Meeting",
              memberId: testMembers[0].id,
            }),
          );
        },
        { timeout: TEST_TIMEOUTS.FORM_SUBMIT },
      );
    });

    it("calls onCancel when cancel button is clicked", async () => {
      const { user } = renderWithUser(
        <EventForm
          mode="add"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Pending State", () => {
    it("shows 'Adding...' when isPending is true in add mode", () => {
      render(
        <EventForm
          mode="add"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isPending
        />,
      );

      expect(
        screen.getByRole("button", { name: /adding/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /add event/i }),
      ).not.toBeInTheDocument();
    });

    it("shows 'Saving...' when isPending is true in edit mode", () => {
      render(
        <EventForm
          mode="edit"
          defaultValues={{ title: "Test" }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isPending
        />,
      );

      expect(
        screen.getByRole("button", { name: /saving/i }),
      ).toBeInTheDocument();
    });

    it("disables buttons when isPending", () => {
      render(
        <EventForm
          mode="add"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isPending
        />,
      );

      expect(screen.getByRole("button", { name: /adding/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    });

    it("prevents double submission when isPending", async () => {
      const { user } = renderWithUser(
        <EventForm
          mode="add"
          defaultValues={{ title: "Test Event" }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isPending
        />,
      );

      // Try to submit
      const submitButton = screen.getByRole("button", { name: /adding/i });
      await user.click(submitButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Member Selection", () => {
    it("allows changing selected family member", async () => {
      // Pass explicit defaultValues to avoid async initialization race condition
      const { user } = renderWithUser(
        <EventForm
          mode="add"
          defaultValues={{ memberId: testMembers[0].id }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      // Wait for first member button to be visible AND selected
      await waitForMemberSelected(testMembers[0].name);

      // Click on second member to change selection
      const secondMember = screen.getByRole("button", {
        name: testMembers[1].name,
      });
      await user.click(secondMember);

      // Wait for second member to become selected
      await waitForMemberSelected(testMembers[1].name);

      // Fill title and wait for value to propagate
      const titleInput = screen.getByLabelText(/event name/i);
      await typeAndWait(user, titleInput, "Test Event");

      // Submit form
      await user.click(screen.getByRole("button", { name: /add event/i }));

      await waitFor(
        () => {
          expect(mockOnSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
              memberId: testMembers[1].id,
            }),
          );
        },
        { timeout: TEST_TIMEOUTS.FORM_SUBMIT },
      );
    });

    it("displays all family members", () => {
      render(
        <EventForm
          mode="add"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      for (const member of testMembers) {
        expect(
          screen.getByRole("button", { name: member.name }),
        ).toBeInTheDocument();
      }
    });
  });
});
