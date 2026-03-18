import type { CalendarEvent } from "@/lib/types";
import { fireEvent, render, screen } from "@/test/test-utils";
import { MobileEventDetail } from "./mobile-event-detail";

const mockEvent: CalendarEvent = {
  id: "1",
  title: "Soccer Practice",
  date: new Date(2026, 2, 18),
  startTime: "11:00 AM",
  endTime: "12:30 PM",
  memberId: "m1",
  isAllDay: false,
};

const mockMember = { id: "m1", name: "Kid1", color: "green" as const };

describe("MobileEventDetail", () => {
  it("renders event title in colored header", () => {
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Soccer Practice")).toBeInTheDocument();
  });

  it("renders member name", () => {
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Kid1")).toBeInTheDocument();
  });

  it("renders date and time", () => {
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/11:00 AM/)).toBeInTheDocument();
    expect(screen.getByText(/12:30 PM/)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByText("Soccer Practice")).not.toBeInTheDocument();
  });

  it("calls onClose when Back is clicked", async () => {
    const onClose = vi.fn();
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={true}
        onClose={onClose}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders Edit and Delete buttons", () => {
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("hides location row when no location", () => {
    render(
      <MobileEventDetail
        event={mockEvent}
        member={mockMember}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByText("Riverside Park")).not.toBeInTheDocument();
  });

  it("shows location row when event has location", () => {
    const eventWithLocation = { ...mockEvent, location: "Riverside Park" };
    render(
      <MobileEventDetail
        event={eventWithLocation}
        member={mockMember}
        isOpen={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Riverside Park")).toBeInTheDocument();
  });
});
