import { beforeEach } from "vitest";
import FamilyHub from "./App";
import { render, resetFamilyStore, screen } from "./test/test-utils";

describe("App", () => {
  beforeEach(() => {
    // Reset and mark as hydrated so App shows onboarding (not loading state)
    resetFamilyStore();
  });
  it("renders without crashing", async () => {
    render(<FamilyHub />);

    // In test environment, Zustand hydrates synchronously
    // App renders onboarding when setupComplete is false
    // Use findByText to wait for lazy-loaded component
    expect(await screen.findByText("Welcome to FamilyHub")).toBeInTheDocument();
  });

  it("shows get started button in onboarding", async () => {
    render(<FamilyHub />);

    // Wait for lazy-loaded onboarding component
    expect(
      await screen.findByRole("button", { name: /get started/i }),
    ).toBeInTheDocument();
  });
});
