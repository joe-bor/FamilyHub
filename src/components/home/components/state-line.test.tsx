import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StateLine } from "./state-line";

describe("StateLine", () => {
  it("renders both segments", () => {
    render(<StateLine choresRemaining={3} dinnerTitle="Tacos" />);
    expect(screen.getByText(/3 chores left today/i)).toBeInTheDocument();
    expect(screen.getByText(/Tacos/)).toBeInTheDocument();
  });
  it("renders nothing when empty", () => {
    const { container } = render(
      <StateLine choresRemaining={0} dinnerTitle={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("uses the singular 'chore' for exactly one", () => {
    render(<StateLine choresRemaining={1} dinnerTitle={null} />);
    expect(screen.getByText("1 chore left today")).toBeInTheDocument();
  });

  it("renders only the chores segment when there is no dinner", () => {
    render(<StateLine choresRemaining={2} dinnerTitle={null} />);
    expect(screen.getByText("2 chores left today")).toBeInTheDocument();
  });

  it("renders only the dinner segment when no chores remain", () => {
    render(<StateLine choresRemaining={0} dinnerTitle="Pasta" />);
    expect(screen.getByText("Pasta tonight")).toBeInTheDocument();
  });
});
