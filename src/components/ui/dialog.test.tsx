import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

describe("DialogContent mobile sizing contract", () => {
  function renderContent(className?: string) {
    render(
      <Dialog open>
        <DialogContent className={className}>
          <DialogTitle>Sizing</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    return screen.getByRole("dialog");
  }

  it("reserves explicit horizontal gutters via a width calc instead of full width plus external margins", () => {
    const content = renderContent();

    // The centered box must subtract gutters from its own width so it never
    // overflows narrow phones (issue #249). Full width + external margins
    // (w-full + mx-4) is the regression that cut content off horizontally.
    expect(content.className).toContain("w-[calc(100%-2rem)]");
    expect(content.className).not.toContain("w-full");
    expect(content.className).not.toMatch(/(^|\s)mx-4(\s|$)/);
  });

  it("preserves the desktop max-w-md cap", () => {
    const content = renderContent();
    expect(content.className).toContain("max-w-md");
  });

  it("still merges caller-supplied classes", () => {
    const content = renderContent("max-w-lg");
    expect(content.className).toContain("max-w-lg");
  });
});

describe("DialogContent viewport height bound", () => {
  function renderContent(className?: string) {
    render(
      <Dialog open>
        <DialogContent className={className}>
          <DialogTitle>Bounded</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    return screen.getByRole("dialog");
  }

  it("bounds its height to the viewport and scrolls overflow by default", () => {
    // A fixed, centered dialog does not extend the document, so content that
    // grows past the viewport pushes the submit button below the fold with
    // nothing to scroll. The bound must be the DialogContent default so every
    // caller is safe without opting in per-site.
    const content = renderContent();

    expect(content.className).toContain("max-h-[90dvh]");
    expect(content.className).toContain("overflow-y-auto");
  });

  it("lets callers override the height cap via twMerge", () => {
    // The default is a floor, not a cage: a caller that needs a different
    // height cap can still pass one and win the conflict.
    const content = renderContent("max-h-screen");

    expect(content.className).toContain("max-h-screen");
    expect(content.className).not.toContain("max-h-[90dvh]");
  });
});
