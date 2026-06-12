import { render, screen } from "@/test/test-utils";
import { ResponsiveFormDialog } from "./responsive-form-dialog";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });

  vi.mocked(window.matchMedia).mockImplementation((query: string) => {
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

    return {
      matches: matchesMax && matchesMin,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });
}

describe("ResponsiveFormDialog breakpoint", () => {
  it("keeps the desktop dialog surface at the 768px md breakpoint", () => {
    setViewportWidth(768);

    render(
      <ResponsiveFormDialog open onOpenChange={vi.fn()} title="Family Settings">
        <p>content</p>
      </ResponsiveFormDialog>,
    );

    expect(
      screen.getByRole("dialog", { name: "Family Settings" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("uses the mobile sheet surface below the 768px md breakpoint", () => {
    setViewportWidth(767);

    render(
      <ResponsiveFormDialog open onOpenChange={vi.fn()} title="Family Settings">
        <p>content</p>
      </ResponsiveFormDialog>,
    );

    expect(
      screen.getByRole("dialog", { name: "Family Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
});
