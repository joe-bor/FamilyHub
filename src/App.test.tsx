import { beforeEach } from "vitest";
import FamilyHub from "./App";
import {
  render,
  renderWithUser,
  resetFamilyStore,
  screen,
  seedAuthStore,
} from "./test/test-utils";

describe("App", () => {
  beforeEach(() => {
    // Reset and mark as hydrated so App shows auth flow (not loading state)
    resetFamilyStore();
    // Mark auth as hydrated (not authenticated) so login screen renders
    seedAuthStore({ isAuthenticated: false });
  });

  it("renders login screen when not authenticated", async () => {
    render(<FamilyHub />);

    // App renders login screen when not authenticated
    // Use findByText to wait for lazy-loaded component
    expect(await screen.findByText("Welcome Back!")).toBeInTheDocument();
    expect(
      screen.getByText("Sign in to your family calendar"),
    ).toBeInTheDocument();
  });

  it("shows sign in button on login screen", async () => {
    render(<FamilyHub />);

    // Wait for lazy-loaded login component
    expect(
      await screen.findByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("navigates to onboarding when Create an account is clicked", async () => {
    const { user } = renderWithUser(<FamilyHub />);

    // Wait for login screen to load
    await screen.findByText("Welcome Back!");

    // Click Create an account link
    await user.click(
      screen.getByRole("button", { name: /create an account/i }),
    );

    // Should now show onboarding welcome screen
    expect(await screen.findByText("Welcome to FamilyHub")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /get started/i }),
    ).toBeInTheDocument();
  });
});
