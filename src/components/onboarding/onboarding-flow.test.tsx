import { HttpResponse, http } from "msw";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  API_BASE,
  getMockFamily,
  resetMockFamily,
  resetMockUsers,
  server,
} from "@/test/mocks/server";
import {
  render,
  renderWithUser,
  resetFamilyStore,
  screen,
  waitFor,
} from "@/test/test-utils";
import { OnboardingFlow } from "./onboarding-flow";

describe("OnboardingFlow", () => {
  // Setup MSW server for this test suite
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => {
    server.resetHandlers();
    resetMockFamily();
    resetMockUsers();
  });
  afterAll(() => server.close());

  beforeEach(() => {
    resetFamilyStore();
  });
  // afterEach cleanup handled globally by setup.ts

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

      expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    });

    it("has back button that returns to welcome", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);

      // Go to family name step
      await user.click(screen.getByRole("button", { name: /get started/i }));
      expect(screen.getByText("What's your family name?")).toBeInTheDocument();

      // Click back
      await user.click(screen.getByRole("button", { name: /go back/i }));

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
      await user.click(screen.getByRole("button", { name: /go back/i }));

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

      expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    });

    it("shows Add Family Member button", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToMembersStep(user);

      expect(screen.getByText("Add Family Member")).toBeInTheDocument();
    });

    it("disables Continue button when no members", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToMembersStep(user);

      expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
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

    it("enables Continue after adding a member", async () => {
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

      // Continue should now be enabled
      expect(
        screen.getByRole("button", { name: /continue/i }),
      ).not.toBeDisabled();
    });

    it("navigates back to family name step", async () => {
      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToMembersStep(user);

      await user.click(screen.getByRole("button", { name: /go back/i }));

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

      // Continue to credentials step
      await user.click(screen.getByRole("button", { name: /continue/i }));

      // Step 4: Credentials
      expect(screen.getByText("Create Your Login")).toBeInTheDocument();
      await user.type(screen.getByLabelText(/username/i), "testfamily");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "password123",
      );

      // Complete setup
      await user.click(screen.getByRole("button", { name: /complete setup/i }));

      // Wait for mutation to complete by checking MSW mock data
      await waitFor(() => {
        const mockFamily = getMockFamily();
        expect(mockFamily).not.toBeNull();
        expect(mockFamily?.name).toBe("The Test Family");
        expect(mockFamily?.members).toHaveLength(1);
        expect(mockFamily?.members[0].name).toBe("Parent One");
        expect(mockFamily?.members).toHaveLength(1);
      });
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

      // Continue to credentials step
      await user.click(screen.getByRole("button", { name: /continue/i }));

      // Step 4: Credentials
      expect(screen.getByText("Create Your Login")).toBeInTheDocument();
      await user.type(screen.getByLabelText(/username/i), "bigfamily");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "password123",
      );

      // Complete
      await user.click(screen.getByRole("button", { name: /complete setup/i }));

      // Wait for mutation to complete by checking MSW mock data
      await waitFor(() => {
        const mockFamily = getMockFamily();
        expect(mockFamily).not.toBeNull();
        expect(mockFamily?.members).toHaveLength(2);
      });
    });
  });

  describe("Credentials Step Error Handling", () => {
    async function navigateToCredentialsStep(
      user: ReturnType<typeof renderWithUser>["user"],
    ) {
      // Step 1: Welcome
      await user.click(screen.getByRole("button", { name: /get started/i }));

      // Step 2: Family Name
      await user.type(screen.getByRole("textbox"), "Test Family");
      await user.click(screen.getByRole("button", { name: /continue/i }));

      // Step 3: Add a member
      await user.click(
        screen.getByRole("button", { name: /add family member/i }),
      );
      await waitFor(() =>
        expect(screen.getByRole("dialog")).toBeInTheDocument(),
      );
      await user.type(screen.getByLabelText(/name/i), "Test Member");
      await user.click(
        screen.getByRole("button", { name: /select coral color/i }),
      );
      await user.click(screen.getByRole("button", { name: /^add$/i }));
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );

      // Continue to credentials step
      await user.click(screen.getByRole("button", { name: /continue/i }));
      expect(screen.getByText("Create Your Login")).toBeInTheDocument();
    }

    it("displays network error message when registration fails due to network", async () => {
      // Override registration endpoint to simulate network error
      server.use(
        http.post(`${API_BASE}/auth/register`, () => {
          return HttpResponse.error();
        }),
      );

      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToCredentialsStep(user);

      // Fill credentials
      await user.type(screen.getByLabelText(/username/i), "testuser");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "password123",
      );

      // Submit
      await user.click(screen.getByRole("button", { name: /complete setup/i }));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/unable to connect/i)).toBeInTheDocument();
      });
    });

    it("displays conflict error message when username is taken during registration", async () => {
      // Override registration endpoint to simulate conflict
      server.use(
        http.post(`${API_BASE}/auth/register`, () => {
          return HttpResponse.json(
            { message: "Username already taken", field: "username" },
            { status: 409 },
          );
        }),
      );

      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToCredentialsStep(user);

      // Fill credentials
      await user.type(screen.getByLabelText(/username/i), "existinguser");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "password123",
      );

      // Submit
      await user.click(screen.getByRole("button", { name: /complete setup/i }));

      // Wait for specific conflict error message
      await waitFor(() => {
        expect(
          screen.getByText(/username was just taken/i),
        ).toBeInTheDocument();
      });
    });

    it("displays server error message when server returns 500", async () => {
      // Override registration endpoint to simulate server error
      server.use(
        http.post(`${API_BASE}/auth/register`, () => {
          return HttpResponse.json(
            { message: "Internal server error" },
            { status: 500 },
          );
        }),
      );

      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToCredentialsStep(user);

      // Fill credentials
      await user.type(screen.getByLabelText(/username/i), "testuser");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "password123",
      );

      // Submit
      await user.click(screen.getByRole("button", { name: /complete setup/i }));

      // Wait for server error message
      await waitFor(() => {
        expect(
          screen.getByText(/something went wrong on our end/i),
        ).toBeInTheDocument();
      });
    });

    it("clears error when user retries registration", async () => {
      // First attempt will fail
      let requestCount = 0;
      server.use(
        http.post(`${API_BASE}/auth/register`, () => {
          requestCount++;
          if (requestCount === 1) {
            return HttpResponse.json(
              { message: "Internal server error" },
              { status: 500 },
            );
          }
          // Second attempt succeeds (fall through to default handler)
          return HttpResponse.json({
            data: {
              token: "mock-token",
              family: {
                id: "family-1",
                name: "Test Family",
                members: [],
                createdAt: new Date().toISOString(),
              },
            },
            message: "Registration successful",
          });
        }),
      );

      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToCredentialsStep(user);

      // Fill credentials
      await user.type(screen.getByLabelText(/username/i), "testuser");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "password123",
      );

      // First submit - should fail
      await user.click(screen.getByRole("button", { name: /complete setup/i }));

      // Wait for error message
      await waitFor(() => {
        expect(
          screen.getByText(/something went wrong on our end/i),
        ).toBeInTheDocument();
      });

      // Retry - error should clear and succeed
      await user.click(screen.getByRole("button", { name: /complete setup/i }));

      // Error should be gone during submission
      await waitFor(() => {
        expect(
          screen.queryByText(/something went wrong on our end/i),
        ).not.toBeInTheDocument();
      });
    });

    it("disables back button while registration is in progress", async () => {
      // Make registration take a while
      server.use(
        http.post(`${API_BASE}/auth/register`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({
            data: {
              token: "mock-token",
              family: {
                id: "family-1",
                name: "Test Family",
                members: [],
                createdAt: new Date().toISOString(),
              },
            },
            message: "Registration successful",
          });
        }),
      );

      const { user } = renderWithUser(<OnboardingFlow />);
      await navigateToCredentialsStep(user);

      // Fill credentials
      await user.type(screen.getByLabelText(/username/i), "testuser");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "password123",
      );

      // Submit
      await user.click(screen.getByRole("button", { name: /complete setup/i }));

      // Back button should be disabled while submitting
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /go back/i })).toBeDisabled();
      });
    });
  });
});
