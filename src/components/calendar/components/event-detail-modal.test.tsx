import { userEvent } from "@testing-library/user-event";
import type { CalendarEvent } from "@/lib/types";
import { render, screen } from "@/test/test-utils";
import { EventDetailModal } from "./event-detail-modal";

vi.mock("@/hooks", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/api", () => ({
  useFamilyMembers: () => [
    { id: "m1", name: "Alice", color: "coral" as const },
  ],
}));

const mockToast = vi.fn();
vi.mock("@/components/ui/toaster", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

const baseEvent: CalendarEvent = {
  id: "e1",
  title: "Test Event",
  startTime: "09:00",
  endTime: "10:00",
  date: new Date("2026-01-15"),
  memberId: "m1",
  isAllDay: false,
};

const mockClose = vi.fn();
const mockEdit = vi.fn();
const mockDelete = vi.fn();

const defaultProps = {
  event: baseEvent,
  isOpen: true,
  onClose: mockClose,
  onEdit: mockEdit,
  onDelete: mockDelete,
};

describe("EventDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows description when present", () => {
    render(
      <EventDetailModal
        {...defaultProps}
        event={{ ...baseEvent, description: "Meeting notes here" }}
      />,
    );
    expect(screen.getByText("Meeting notes here")).toBeInTheDocument();
  });

  it("does not show description section when absent", () => {
    render(<EventDetailModal {...defaultProps} />);
    expect(screen.queryByText("Meeting notes here")).not.toBeInTheDocument();
  });

  it("shows 'Open in Google Calendar' link for Google events", () => {
    render(
      <EventDetailModal
        {...defaultProps}
        event={{
          ...baseEvent,
          source: "GOOGLE",
          htmlLink: "https://calendar.google.com/event/123",
        }}
      />,
    );
    const link = screen.getByRole("link", { name: /open in google calendar/i });
    expect(link).toHaveAttribute(
      "href",
      "https://calendar.google.com/event/123",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows toast when clicking Edit on a Google event", async () => {
    const user = userEvent.setup();
    render(
      <EventDetailModal
        {...defaultProps}
        event={{ ...baseEvent, source: "GOOGLE" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(mockToast).toHaveBeenCalled();
    expect(mockEdit).not.toHaveBeenCalled();
  });

  it("shows toast when clicking Delete on a Google event", async () => {
    const user = userEvent.setup();
    render(
      <EventDetailModal
        {...defaultProps}
        event={{ ...baseEvent, source: "GOOGLE" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(mockToast).toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("calls onEdit normally for native events", async () => {
    const user = userEvent.setup();
    render(<EventDetailModal {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(mockEdit).toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });
});
