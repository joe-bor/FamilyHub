import { render, screen } from "@/test/test-utils";
import { InstallInstructionsSheet } from "./install-instructions-sheet";

let ios = false;
vi.mock("@/lib/pwa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/pwa")>();
  return { ...actual, isIOS: () => ios };
});

describe("InstallInstructionsSheet", () => {
  it("shows iOS Share / Add to Home Screen copy on iOS", () => {
    ios = true;
    render(<InstallInstructionsSheet isOpen onClose={vi.fn()} />);
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("shows generic browser-menu copy elsewhere", () => {
    ios = false;
    render(<InstallInstructionsSheet isOpen onClose={vi.fn()} />);
    expect(screen.getByText(/browser menu/i)).toBeInTheDocument();
  });
});
