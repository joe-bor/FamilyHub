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
