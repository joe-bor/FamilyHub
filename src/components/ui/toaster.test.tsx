import { act, render, screen } from "@/test/test-utils";
import { Toaster, toast } from "./toaster";

describe("toast duration", () => {
  it("stays mounted when duration is Infinity", () => {
    vi.useFakeTimers();
    render(<Toaster />);

    act(() => {
      toast({ title: "Sticky update", duration: Number.POSITIVE_INFINITY });
    });
    expect(screen.getByText("Sticky update")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByText("Sticky update")).toBeInTheDocument();
  });

  it("auto-dismisses with the default duration", () => {
    vi.useFakeTimers();
    render(<Toaster />);

    act(() => {
      toast({ title: "Default toast" });
    });
    expect(screen.getByText("Default toast")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Default toast")).not.toBeInTheDocument();
  });
});
