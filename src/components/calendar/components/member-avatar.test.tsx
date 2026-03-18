import { render, screen } from "@/test/test-utils";
import { MemberAvatar } from "./member-avatar";

describe("MemberAvatar", () => {
  it("renders member initial", () => {
    render(<MemberAvatar name="Alice" color="coral" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("applies member color as background", () => {
    render(<MemberAvatar name="Alice" color="coral" />);
    const el = screen.getByText("A");
    // coral bg maps to bg-[#e88470] via colorMap
    expect(el).toHaveClass("bg-[#e88470]");
  });

  it("renders at default size (24px)", () => {
    render(<MemberAvatar name="Bob" color="teal" />);
    const el = screen.getByText("B");
    expect(el).toHaveClass("w-6", "h-6");
  });

  it("renders at custom size", () => {
    render(<MemberAvatar name="Bob" color="teal" size="sm" />);
    const el = screen.getByText("B");
    expect(el).toHaveClass("w-5", "h-5");
  });

  it("renders ring variant (outline, no fill)", () => {
    render(<MemberAvatar name="Carol" color="green" variant="ring" />);
    const el = screen.getByText("C");
    expect(el).toHaveClass("border-2");
    expect(el).not.toHaveClass("bg-[#7bc67b]");
  });
});
