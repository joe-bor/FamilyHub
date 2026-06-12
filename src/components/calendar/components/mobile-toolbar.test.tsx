import { render, screen } from "@/test/test-utils";
import { MobileToolbar } from "./mobile-toolbar";

const mockMembers = [
  { id: "m1", name: "Alice", color: "coral" as const },
  { id: "m2", name: "Bob", color: "teal" as const },
];

// The title / Today / Menu row moved to the shared module-aware AppHeader
// (covered in app-header.test.tsx). MobileToolbar is now just the controls row.
describe("MobileToolbar", () => {
  it("renders view switcher with D/W/M/S pills", () => {
    render(<MobileToolbar members={mockMembers} />);
    expect(screen.getByRole("button", { name: /daily/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /weekly/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /monthly/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /schedule/i }),
    ).toBeInTheDocument();
  });

  it("renders member filter dots for each member", () => {
    render(<MobileToolbar members={mockMembers} />);
    expect(screen.getByText("A")).toBeInTheDocument(); // Alice initial
    expect(screen.getByText("B")).toBeInTheDocument(); // Bob initial
  });

  it("does not render the context label, Today, or Menu (now in AppHeader)", () => {
    render(<MobileToolbar members={mockMembers} />);
    expect(
      screen.queryByRole("button", { name: /today/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /menu/i }),
    ).not.toBeInTheDocument();
  });
});
