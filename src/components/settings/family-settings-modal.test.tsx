import { QueryClient } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { type FamilyApiResponse, familyKeys } from "@/api";
import type {
  AddMemberRequest,
  FamilyData,
  UpdateMemberRequest,
} from "@/lib/types";
import {
  API_BASE,
  resetMockFamily,
  seedMockFamily,
} from "@/test/mocks/handlers";
import { server } from "@/test/mocks/server";
import {
  render,
  renderWithUser,
  screen,
  waitFor,
  within,
} from "@/test/test-utils";
import { FamilySettingsModal } from "./family-settings-modal";

// The responsive wrapper switches on useIsMobile; default to desktop so the
// existing dialog-role assertions below keep exercising the centered dialog.
let mockIsMobile = false;
vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return { ...actual, useIsMobile: () => mockIsMobile };
});

// ============================================================================
// Test Setup
// ============================================================================

const alice = { id: "member-1", name: "Alice", color: "coral" } as const;

function baseFamily(): FamilyData {
  return {
    id: "family-1",
    name: "Test Family",
    members: [{ ...alice }],
    createdAt: "2025-01-01T00:00:00.000Z",
  };
}

/**
 * Dedicated client with `gcTime`/`staleTime` of Infinity so the optimistic
 * cache survives the test and no background refetch races our assertions.
 */
function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

beforeEach(() => {
  resetMockFamily();
  mockIsMobile = false;
});

afterEach(() => {
  server.resetHandlers();
});

const noop = () => {};

// ============================================================================
// Pending member guard
// ============================================================================

describe("FamilySettingsModal — pending member controls", () => {
  it("disables edit/remove for a member whose add has not been confirmed", () => {
    // A member still carrying the optimistic `temp-` id from useAddMember:
    // its create round-trip has not resolved, so the server does not know it yet.
    const family: FamilyData = {
      ...baseFamily(),
      members: [
        { ...alice },
        { id: "temp-1700000000000", name: "Bob", color: "teal" },
      ],
    };
    const client = createClient();
    client.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: family,
    });

    render(<FamilySettingsModal open onOpenChange={noop} />, {
      queryClient: client,
    });

    // Confirmed member: controls are interactive.
    expect(screen.getByRole("button", { name: "Edit Alice" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Remove Alice" })).toBeEnabled();

    // Unconfirmed member: editing/removing it would target a non-existent
    // `temp-` id on the server, so the controls must be disabled until the
    // add is confirmed.
    expect(screen.getByRole("button", { name: "Edit Bob" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove Bob" })).toBeDisabled();
  });
});

// ============================================================================
// Add → edit race (the e2e flake reproduced deterministically)
// ============================================================================

describe("FamilySettingsModal — add then immediately edit", () => {
  it("never sends the rename to a temp id and keeps the rename after the add confirms", async () => {
    // Gate the add POST so the optimistic `temp-` id is still in the list when
    // we open the editor — this is the exact window the parallel e2e workers hit.
    let releasePost!: () => void;
    const postGate = new Promise<void>((resolve) => {
      releasePost = resolve;
    });
    const putIds: string[] = [];

    server.use(
      http.post(`${API_BASE}/family/members`, async ({ request }) => {
        const body = (await request.json()) as AddMemberRequest;
        await postGate;
        return HttpResponse.json({
          data: { id: "member-real", name: body.name, color: body.color },
          message: "Member added",
        });
      }),
      http.put(
        `${API_BASE}/family/members/:id`,
        async ({ params, request }) => {
          putIds.push(String(params.id));
          const body = (await request.json()) as UpdateMemberRequest;
          return HttpResponse.json({
            data: { id: String(params.id), name: body.name, color: body.color },
            message: "Member updated",
          });
        },
      ),
    );

    const family = baseFamily();
    seedMockFamily(family);
    const client = createClient();
    client.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: family,
    });

    const { user } = renderWithUser(
      <FamilySettingsModal open onOpenChange={noop} />,
      { queryClient: client },
    );

    // --- Add "Bob" (POST is gated, so Bob stays optimistic) ---
    await user.click(screen.getByRole("button", { name: "Add" }));
    const addDialog = await screen.findByRole("dialog", {
      name: "Add Family Member",
    });
    await user.type(
      within(addDialog).getByPlaceholderText("Enter name"),
      "Bob",
    );
    await user.click(
      within(addDialog).getByRole("button", { name: /select teal color/i }),
    );
    await user.click(within(addDialog).getByRole("button", { name: "Add" }));

    // Optimistic Bob is shown but unconfirmed → its edit control is disabled.
    const editBob = await screen.findByRole("button", { name: "Edit Bob" });
    expect(editBob).toBeDisabled();

    // --- Confirm the add; the real id replaces the temp id ---
    releasePost();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Edit Bob" })).toBeEnabled(),
    );

    // --- Rename Bob → Robert ---
    await user.click(screen.getByRole("button", { name: "Edit Bob" }));
    const editDialog = await screen.findByRole("dialog", {
      name: "Edit Family Member",
    });
    const nameInput = within(editDialog).getByPlaceholderText("Enter name");
    await user.clear(nameInput);
    await user.type(nameInput, "Robert");
    await user.click(within(editDialog).getByRole("button", { name: "Save" }));

    // The rename sticks (it was sent to the real id, not a temp id).
    expect(
      await screen.findByRole("button", { name: "Edit Robert" }),
    ).toBeInTheDocument();
    expect(putIds.length).toBeGreaterThan(0);
    expect(putIds.some((id) => id.startsWith("temp-"))).toBe(false);
  });
});

// ============================================================================
// Responsive surface: centered dialog on desktop, bottom sheet on mobile
// ============================================================================

describe("FamilySettingsModal — responsive surface", () => {
  function seededClient(): QueryClient {
    const client = createClient();
    client.setQueryData<FamilyApiResponse>(familyKeys.family(), {
      data: baseFamily(),
    });
    return client;
  }

  it("renders a centered dialog with an X close button on desktop", () => {
    mockIsMobile = false;
    render(<FamilySettingsModal open onOpenChange={noop} />, {
      queryClient: seededClient(),
    });

    expect(
      screen.getByRole("dialog", { name: "Family Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    // The mobile sheet's Cancel chrome is absent on desktop.
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("renders the content in a bottom sheet with Cancel (no X) on mobile", () => {
    mockIsMobile = true;
    render(<FamilySettingsModal open onOpenChange={noop} />, {
      queryClient: seededClient(),
    });

    expect(
      screen.getByRole("dialog", { name: "Family Settings" }),
    ).toBeInTheDocument();
    // Sheet supplies the Cancel affordance; the in-content X close is desktop-only.
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    // Content still renders inside the sheet.
    expect(
      screen.getByRole("button", { name: "Edit Alice" }),
    ).toBeInTheDocument();
  });
});
