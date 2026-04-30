import { render, screen } from "@/test/test-utils";
import { DashboardHeader } from "./dashboard-header";

describe("DashboardHeader", () => {
  it.each([
    [new Date(2026, 3, 25, 9, 0, 0, 0), "Good morning, Test Family"],
    [new Date(2026, 3, 25, 14, 0, 0, 0), "Good afternoon, Test Family"],
    [new Date(2026, 3, 25, 19, 0, 0, 0), "Good evening, Test Family"],
  ])("renders the right greeting for %s", (now, greeting) => {
    render(<DashboardHeader familyName="Test Family" now={now} />);

    expect(screen.getByText(greeting)).toBeInTheDocument();
    expect(screen.getByText("Saturday, Apr 25")).toBeInTheDocument();
  });

  it("allows the header to wrap on narrow layouts", () => {
    render(
      <DashboardHeader
        familyName="Test Family"
        now={new Date(2026, 3, 25, 9)}
      />,
    );

    expect(screen.getByTestId("dashboard-header")).toHaveClass("flex-wrap");
  });
});
