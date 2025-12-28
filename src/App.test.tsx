import { describe, expect, it } from "vitest";
import FamilyHub from "./App";
import { render, screen } from "./test/test-utils";

describe("App", () => {
  it("renders without crashing", () => {
    render(<FamilyHub />);

    // In test environment, Zustand hydrates synchronously
    // App renders onboarding when setupComplete is false
    expect(screen.getByText("Welcome to FamilyHub")).toBeInTheDocument();
  });

  it("shows get started button in onboarding", () => {
    render(<FamilyHub />);

    expect(
      screen.getByRole("button", { name: /get started/i }),
    ).toBeInTheDocument();
  });
});
