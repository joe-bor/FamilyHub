import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useFamilyStore } from "@/stores";
import {
  render,
  renderWithUser,
  resetFamilyStore,
  screen,
  waitFor,
} from "@/test/test-utils";
import { OnboardingFlow } from "./onboarding-flow";

describe("OnboardingFlow", () => {
  beforeEach(() => {
    resetFamilyStore();
  });

  afterEach(() => {
    resetFamilyStore();
  });

  describe("Welcome Step", () => {
    it("renders welcome screen initially", () => {
      render(<OnboardingFlow />);

      expect(screen.getByText("Welcome to FamilyHub")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /get started/i }),
      ).toBeInTheDocument();
    });

    it("shows feature highlights", () => {
      render(<OnboardingFlow />);

      expect(screen.getByText("Shared Calendar")).toBeInTheDocument();
      expect(screen.getByText("Family Profiles")).toBeInTheDocument();
    });

    it("advances to family name step on Get Started click", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);

      await user.click(screen.getByRole("button", { name: /get started/i }));

      expect(screen.getByText("What's your family name?")).toBeInTheDocument();
    });
  });

  describe("Family Name Step", () => {
    it("shows step indicator", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);

      await user.click(screen.getByRole("button", { name: /get started/i }));

      expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    });

    it("has back button that returns to welcome", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);

      // Go to family name step
      await user.click(screen.getByRole("button", { name: /get started/i }));
      expect(screen.getByText("What's your family name?")).toBeInTheDocument();

      // Click back
      await user.click(screen.getByRole("button", { name: "" })); // Back button has no text, just icon

      expect(screen.getByText("Welcome to FamilyHub")).toBeInTheDocument();
    });

    it("shows validation error for empty name", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);

      await user.click(screen.getByRole("button", { name: /get started/i }));

      // Try to continue without entering name
      await user.click(screen.getByRole("button", { name: /continue/i }));

      expect(screen.getByText(/family name is required/i)).toBeInTheDocument();
    });

    it("shows validation error for name too long", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);

      await user.click(screen.getByRole("button", { name: /get started/i }));

      const longName = "a".repeat(51);
      await user.type(screen.getByRole("textbox"), longName);
      await user.click(screen.getByRole("button", { name: /continue/i }));

      expect(
        screen.getByText(/must be 50 characters or less/i),
      ).toBeInTheDocument();
    });

    it("advances to members step with valid name", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);

      await user.click(screen.getByRole("button", { name: /get started/i }));
      await user.type(screen.getByRole("textbox"), "The Smiths");
      await user.click(screen.getByRole("button", { name: /continue/i }));

      expect(screen.getByText("Who's in your family?")).toBeInTheDocument();
    });

    it("preserves family name when navigating back and forth", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);

      // Enter family name
      await user.click(screen.getByRole("button", { name: /get started/i }));
      await user.type(screen.getByRole("textbox"), "The Johnsons");
      await user.click(screen.getByRole("button", { name: /continue/i }));

      // Go back
      await user.click(screen.getByRole("button", { name: "" }));

      expect(screen.getByRole("textbox")).toHaveValue("The Johnsons");
    });
  });

  describe("Members Step", () => {
    async function navigateToMembersStep(
      user: ReturnType<typeof renderWithUser>["user"],
    ) {
      await user.click(screen.getByRole("button", { name: /get started/i }));
      await user.type(screen.getByRole("textbox"), "Test Family");
      await user.click(screen.getByRole("button", { name: /continue/i }));
    }

    it("shows step indicator", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToMembersStep(user);

      expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
    });

    it("shows Add Family Member button", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToMembersStep(user);

      expect(screen.getByText("Add Family Member")).toBeInTheDocument();
    });

    it("disables Complete Setup button when no members", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToMembersStep(user);

      expect(
        screen.getByRole("button", { name: /complete setup/i }),
      ).toBeDisabled();
      expect(
        screen.getByText("Add at least one family member to continue"),
      ).toBeInTheDocument();
    });

    it("opens member form modal when Add Family Member clicked", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToMembersStep(user);

      // Click the button (not the modal title which doesn't exist yet)
      await user.click(
        screen.getByRole("button", { name: /add family member/i }),
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      // Dialog title
      expect(
        screen.getByRole("heading", { name: /add family member/i }),
      ).toBeInTheDocument();
    });

    it("adds a new member when form is submitted", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToMembersStep(user);

      // Open modal
      await user.click(
        screen.getByRole("button", { name: /add family member/i }),
      );
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Fill form
      await user.type(screen.getByLabelText(/name/i), "John");

      // Select a color (buttons with aria-label like "Select coral color")
      const coralColorButton = screen.getByRole("button", {
        name: /select coral color/i,
      });
      await user.click(coralColorButton);

      // Submit
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      // Modal should close and member should appear
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      expect(screen.getByText("John")).toBeInTheDocument();
    });

    it("enables Complete Setup after adding a member", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToMembersStep(user);

      // Add a member
      await user.click(
        screen.getByRole("button", { name: /add family member/i }),
      );
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/name/i), "Jane");
      await user.click(
        screen.getByRole("button", { name: /select coral color/i }),
      );
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Complete Setup should now be enabled
      expect(
        screen.getByRole("button", { name: /complete setup/i }),
      ).not.toBeDisabled();
    });

    it("navigates back to family name step", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToMembersStep(user);

      await user.click(screen.getByRole("button", { name: "" })); // Back button

      expect(screen.getByText("What's your family name?")).toBeInTheDocument();
    });
  });

  describe("Full Flow & Store Integration", () => {
    it("completes onboarding and persists to store", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);

      // Step 1: Welcome
      await user.click(screen.getByRole("button", { name: /get started/i }));

      // Step 2: Family Name
      await user.type(screen.getByRole("textbox"), "The Test Family");
      await user.click(screen.getByRole("button", { name: /continue/i }));

      // Step 3: Add a member
      await user.click(
        screen.getByRole("button", { name: /add family member/i }),
      );
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/name/i), "Parent One");
      await user.click(
        screen.getByRole("button", { name: /select coral color/i }),
      );
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Complete setup
      await user.click(screen.getByRole("button", { name: /complete setup/i }));

      // Verify store was updated
      const state = useFamilyStore.getState();
      expect(state.family.name).toBe("The Test Family");
      expect(state.family.members).toHaveLength(1);
      expect(state.family.members[0].name).toBe("Parent One");
      expect(state.family.setupComplete).toBe(true);
    });

    it("allows adding multiple members before completing", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);

      // Navigate to members step
      await user.click(screen.getByRole("button", { name: /get started/i }));
      await user.type(screen.getByRole("textbox"), "Big Family");
      await user.click(screen.getByRole("button", { name: /continue/i }));

      // Add first member
      await user.click(
        screen.getByRole("button", { name: /add family member/i }),
      );
      await waitFor(() =>
        expect(screen.getByRole("dialog")).toBeInTheDocument(),
      );
      await user.type(screen.getByLabelText(/name/i), "Mom");
      await user.click(
        screen.getByRole("button", { name: /select coral color/i }),
      );
      await user.click(screen.getByRole("button", { name: /^add$/i }));
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );

      // Add second member
      await user.click(
        screen.getByRole("button", { name: /add family member/i }),
      );
      await waitFor(() =>
        expect(screen.getByRole("dialog")).toBeInTheDocument(),
      );
      await user.type(screen.getByLabelText(/name/i), "Dad");
      await user.click(
        screen.getByRole("button", { name: /select teal color/i }),
      );
      await user.click(screen.getByRole("button", { name: /^add$/i }));
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );

      // Both members should be visible
      expect(screen.getByText("Mom")).toBeInTheDocument();
      expect(screen.getByText("Dad")).toBeInTheDocument();

      // Complete
      await user.click(screen.getByRole("button", { name: /complete setup/i }));

      // Verify store
      const state = useFamilyStore.getState();
      expect(state.family.members).toHaveLength(2);
    });
  });
});
