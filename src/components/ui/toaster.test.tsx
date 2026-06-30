import { act, render, screen } from "@/test/test-utils";
import { ToastAction } from "./toast";
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

describe("toast pointer events", () => {
  it("lets passive notifications pass pointer events through", () => {
    render(<Toaster />);

    act(() => {
      toast({ title: "Passive notification" });
    });

    const toastRoot = screen
      .getByText("Passive notification")
      .closest("[data-state]");
    expect(toastRoot?.parentElement).toHaveClass("pointer-events-none");
    expect(toastRoot).toHaveClass("pointer-events-none");
    expect(toastRoot?.querySelector("[toast-close]")).toHaveClass(
      "pointer-events-auto",
    );
  });

  it("keeps toasts with explicit actions interactive", () => {
    render(<Toaster />);

    act(() => {
      toast({
        title: "Update available",
        action: <ToastAction altText="Reload">Reload</ToastAction>,
        duration: Number.POSITIVE_INFINITY,
      });
    });

    const toastRoot = screen
      .getByText("Update available")
      .closest("[data-state]");
    expect(toastRoot).toHaveClass("pointer-events-auto");
    expect(screen.getByRole("button", { name: "Reload" })).toBeEnabled();
  });
});
