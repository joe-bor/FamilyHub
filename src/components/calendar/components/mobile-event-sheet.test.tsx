import { fireEvent, render, screen } from "@/test/test-utils";
import { MobileEventSheet } from "./mobile-event-sheet";

describe("MobileEventSheet", () => {
  it("renders children when open", () => {
    render(
      <MobileEventSheet isOpen={true} onClose={vi.fn()} title="New Event">
        <div>form content</div>
      </MobileEventSheet>,
    );
    expect(screen.getByText("form content")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <MobileEventSheet isOpen={false} onClose={vi.fn()} title="New Event">
        <div>form content</div>
      </MobileEventSheet>,
    );
    expect(screen.queryByText("form content")).not.toBeInTheDocument();
  });

  it("renders title in header", () => {
    render(
      <MobileEventSheet isOpen={true} onClose={vi.fn()} title="Edit Event">
        <div>content</div>
      </MobileEventSheet>,
    );
    expect(screen.getByText("Edit Event")).toBeInTheDocument();
  });

  it("renders Cancel button that calls onClose", async () => {
    const onClose = vi.fn();
    render(
      <MobileEventSheet isOpen={true} onClose={onClose} title="New Event">
        <div>content</div>
      </MobileEventSheet>,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders right-side slot content when provided", () => {
    render(
      <MobileEventSheet
        isOpen={true}
        onClose={vi.fn()}
        title="New Event"
        headerRight={<button type="button">Add</button>}
      >
        <div>content</div>
      </MobileEventSheet>,
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("uses fixed inset-0 z-50 positioning", () => {
    render(
      <MobileEventSheet isOpen={true} onClose={vi.fn()} title="New Event">
        <div>content</div>
      </MobileEventSheet>,
    );
    const sheet = screen.getByRole("dialog");
    expect(sheet).toHaveClass("fixed", "inset-0", "z-50");
  });
});
