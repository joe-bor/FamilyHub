import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ChoresBoard,
  CreateChoreTemplateRequest,
  UpdateChoreTemplateRequest,
  UpdateCurrentPeriodCompletionRequest,
} from "@/lib/types";
import {
  API_BASE,
  seedMockChoresBoard,
  server,
  setupMswServer,
} from "@/test/mocks/server";
import {
  render,
  renderWithUser,
  screen,
  seedFamilyStore,
  typeAndWait,
  waitFor,
  waitForMemberSelected,
} from "@/test/test-utils";
import { ChoresView } from "./chores-view";

const viewport = vi.hoisted(() => ({ isMobile: false }));
const mockToast = vi.hoisted(() => vi.fn());

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useIsMobile: () => viewport.isMobile,
  };
});

vi.mock("@/components/ui/toaster", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

const STALE_PERIOD_MESSAGE = "Chore period is stale. Refresh and try again.";

function emptyChoresBoard(): ChoresBoard {
  return {
    timezone: "America/Los_Angeles",
    today: {
      scope: "TODAY",
      periodStartDate: "2026-05-17",
      periodEndDate: "2026-05-17",
      summary: { total: 0, completed: 0, remaining: 0 },
      assignees: [],
    },
    thisWeek: {
      scope: "THIS_WEEK",
      periodStartDate: "2026-05-17",
      periodEndDate: "2026-05-23",
      summary: { total: 0, completed: 0, remaining: 0 },
      assignees: [],
    },
    thisMonth: {
      scope: "THIS_MONTH",
      periodStartDate: "2026-05-01",
      periodEndDate: "2026-05-31",
      summary: { total: 0, completed: 0, remaining: 0 },
      assignees: [],
    },
  };
}

function sampleChoresBoard(): ChoresBoard {
  return {
    timezone: "America/Los_Angeles",
    today: {
      scope: "TODAY",
      periodStartDate: "2026-05-17",
      periodEndDate: "2026-05-17",
      summary: { total: 1, completed: 0, remaining: 1 },
      assignees: [
        {
          member: { id: "leo", name: "Leo", color: "coral" },
          summary: { total: 1, completed: 0, remaining: 1 },
          chores: [
            {
              templateId: "brush-teeth-id",
              title: "Brush teeth",
              cadence: "DAILY",
              assignedToMemberId: "leo",
              completed: false,
              completedAt: null,
            },
          ],
        },
      ],
    },
    thisWeek: {
      scope: "THIS_WEEK",
      periodStartDate: "2026-05-17",
      periodEndDate: "2026-05-23",
      summary: { total: 1, completed: 0, remaining: 1 },
      assignees: [
        {
          member: { id: "leo", name: "Leo", color: "coral" },
          summary: { total: 1, completed: 0, remaining: 1 },
          chores: [
            {
              templateId: "trash-id",
              title: "Take out trash",
              cadence: "WEEKLY",
              assignedToMemberId: "leo",
              completed: false,
              completedAt: null,
            },
          ],
        },
      ],
    },
    thisMonth: {
      scope: "THIS_MONTH",
      periodStartDate: "2026-05-01",
      periodEndDate: "2026-05-31",
      summary: { total: 1, completed: 1, remaining: 0 },
      assignees: [
        {
          member: { id: "maya", name: "Maya", color: "teal" },
          summary: { total: 1, completed: 1, remaining: 0 },
          chores: [
            {
              templateId: "fridge-id",
              title: "Deep clean fridge",
              cadence: "MONTHLY",
              assignedToMemberId: "maya",
              completed: true,
              completedAt: "2026-05-10T09:00:00Z",
            },
          ],
        },
      ],
    },
  };
}

describe("ChoresView", () => {
  setupMswServer();

  beforeEach(() => {
    viewport.isMobile = false;
    mockToast.mockClear();
    seedFamilyStore({
      members: [
        { id: "leo", name: "Leo", color: "coral" },
        { id: "maya", name: "Maya", color: "teal" },
      ],
    });
  });

  it("disables creating a recurring routine while the board is loading", () => {
    server.use(
      http.get(`${API_BASE}/chores/board`, () => new Promise(() => undefined)),
    );

    render(<ChoresView />);

    expect(
      screen.getByRole("button", { name: /add recurring chore/i }),
    ).toBeDisabled();
    expect(screen.getByText("Loading chores...")).toBeVisible();
  });

  it("keeps recurring routine creation unavailable when the board fails to load", async () => {
    server.use(
      http.get(`${API_BASE}/chores/board`, () =>
        HttpResponse.json(
          { message: "Could not load chores" },
          { status: 500 },
        ),
      ),
    );
    const { user } = renderWithUser(<ChoresView />);

    expect(
      await screen.findByText("Could not load chores. Try again in a moment."),
    ).toBeVisible();
    const addButton = screen.getByRole("button", {
      name: /add recurring chore/i,
    });

    expect(addButton).toBeDisabled();
    await user.click(addButton);

    expect(
      screen.queryByRole("dialog", { name: "New Chore" }),
    ).not.toBeInTheDocument();
  });

  it("shows one selected scope at a time on mobile", async () => {
    viewport.isMobile = true;
    seedMockChoresBoard(sampleChoresBoard());

    const { user } = renderWithUser(<ChoresView />);

    expect(await screen.findByRole("button", { name: "Day" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await screen.findByRole("region", { name: "Today" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Today" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "This Week" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Week" }));

    expect(screen.getByRole("region", { name: "This Week" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "This Week" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Today" }),
    ).not.toBeInTheDocument();
  });

  it("shows today, this week, and this month columns on larger screens", async () => {
    seedMockChoresBoard(sampleChoresBoard());

    render(<ChoresView />);

    expect(await screen.findByRole("heading", { name: "Today" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "This Week" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "This Month" })).toBeVisible();
  });

  it("shows a family-level empty state when no recurring routines exist anywhere", async () => {
    seedMockChoresBoard(emptyChoresBoard());

    render(<ChoresView />);

    expect(await screen.findByText("No recurring chores yet")).toBeVisible();
  });

  it("shows a scope empty state when one timeframe has no routines", async () => {
    const board = sampleChoresBoard();
    board.thisWeek = {
      scope: "THIS_WEEK",
      periodStartDate: "2026-05-17",
      periodEndDate: "2026-05-23",
      summary: { total: 0, completed: 0, remaining: 0 },
      assignees: [],
    };
    seedMockChoresBoard(board);

    render(<ChoresView />);

    expect(
      await screen.findByText("No routines in this timeframe"),
    ).toBeVisible();
    expect(screen.getByText("Brush teeth")).toBeVisible();
  });

  it("shows all caught up while keeping completed routines visible and secondary", async () => {
    seedMockChoresBoard(sampleChoresBoard());

    render(<ChoresView />);

    expect(await screen.findByText("All caught up")).toBeVisible();
    expect(screen.getByText("Deep clean fridge")).toBeVisible();
    expect(screen.getByTestId("chore-row-fridge-id")).toHaveClass(
      "bg-muted/40",
    );
  });

  it("creates a weekly recurring routine with activeFrom from the board", async () => {
    let capturedCreateBody: CreateChoreTemplateRequest | null = null;
    server.use(
      http.post(`${API_BASE}/chores/templates`, async ({ request }) => {
        capturedCreateBody =
          (await request.json()) as CreateChoreTemplateRequest;
        return HttpResponse.json(
          {
            data: {
              id: "trash-id",
              title: "Take out trash",
              assignedToMemberId: "leo",
              cadence: "WEEKLY",
              activeFrom: "2026-05-17",
              archived: false,
              createdAt: "2026-05-17T09:00:00Z",
              updatedAt: "2026-05-17T09:00:00Z",
            },
          },
          { status: 201 },
        );
      }),
    );
    seedMockChoresBoard(emptyChoresBoard());
    const { user } = renderWithUser(<ChoresView />);

    await user.click(
      await screen.findByRole("button", { name: /add recurring chore/i }),
    );
    await waitForMemberSelected("Leo");
    await typeAndWait(
      user,
      screen.getByLabelText(/chore name/i),
      "Take out trash",
    );
    await user.click(screen.getByRole("button", { name: "Weekly" }));
    await user.click(screen.getByRole("button", { name: /save chore/i }));

    await waitFor(() => {
      expect(capturedCreateBody).toEqual({
        title: "Take out trash",
        assignedToMemberId: "leo",
        cadence: "WEEKLY",
        activeFrom: "2026-05-17",
      });
    });
  });

  it("completes and uncompletes a routine for the current period", async () => {
    let capturedCompletionBody: UpdateCurrentPeriodCompletionRequest | null =
      null;
    let capturedUncompletionBody: UpdateCurrentPeriodCompletionRequest | null =
      null;
    server.use(
      http.put(
        `${API_BASE}/chores/templates/brush-teeth-id/current-period-completion`,
        async ({ request }) => {
          capturedCompletionBody =
            (await request.json()) as UpdateCurrentPeriodCompletionRequest;
          return HttpResponse.json({
            data: {
              scope: "TODAY",
              periodStartDate: "2026-05-17",
              periodEndDate: "2026-05-17",
              item: {
                templateId: "brush-teeth-id",
                title: "Brush teeth",
                cadence: "DAILY",
                assignedToMemberId: "leo",
                completed: true,
                completedAt: "2026-05-17T09:30:00Z",
              },
            },
          });
        },
      ),
      http.delete(
        `${API_BASE}/chores/templates/brush-teeth-id/current-period-completion`,
        async ({ request }) => {
          capturedUncompletionBody =
            (await request.json()) as UpdateCurrentPeriodCompletionRequest;
          return HttpResponse.json({
            data: {
              scope: "TODAY",
              periodStartDate: "2026-05-17",
              periodEndDate: "2026-05-17",
              item: {
                templateId: "brush-teeth-id",
                title: "Brush teeth",
                cadence: "DAILY",
                assignedToMemberId: "leo",
                completed: false,
                completedAt: null,
              },
            },
          });
        },
      ),
    );
    seedMockChoresBoard(sampleChoresBoard());
    const { user } = renderWithUser(<ChoresView />);

    await user.click(
      await screen.findByRole("button", {
        name: /mark brush teeth complete/i,
      }),
    );

    await waitFor(() => {
      expect(capturedCompletionBody).toEqual({
        scope: "TODAY",
        periodStartDate: "2026-05-17",
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId("chore-row-brush-teeth-id")).toHaveClass(
        "bg-muted/40",
      );
    });

    await user.click(
      screen.getByRole("button", { name: /mark brush teeth incomplete/i }),
    );

    await waitFor(() => {
      expect(capturedUncompletionBody).toEqual({
        scope: "TODAY",
        periodStartDate: "2026-05-17",
      });
    });
  });

  it("shows a recovery message when a current-period completion is stale", async () => {
    server.use(
      http.put(
        `${API_BASE}/chores/templates/brush-teeth-id/current-period-completion`,
        () =>
          HttpResponse.json({ message: STALE_PERIOD_MESSAGE }, { status: 400 }),
      ),
    );
    seedMockChoresBoard(sampleChoresBoard());
    const { user } = renderWithUser(<ChoresView />);

    await user.click(
      await screen.findByRole("button", {
        name: /mark brush teeth complete/i,
      }),
    );

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Chores were out of date",
          description: "Refreshing the board. Try that again.",
          variant: "destructive",
        }),
      );
    });
  });

  describe("ChoresView create action placement", () => {
    beforeEach(() => {
      viewport.isMobile = false;
    });

    it("shows a disabled Add recurring chore FAB on mobile that enables once the board loads", async () => {
      viewport.isMobile = true;
      seedMockChoresBoard(emptyChoresBoard());
      renderWithUser(<ChoresView />);
      // Query synchronously on the initial render: the board is still loading,
      // so the module-specific canCreate rule should render the FAB disabled.
      const fab = screen.getByRole("button", { name: "Add recurring chore" });
      // The floating action button is fixed-positioned; the desktop icon
      // button is not — this is what distinguishes the FAB from the old control.
      expect(fab).toHaveClass("fixed");
      expect(fab).toBeDisabled();
      // Once the board resolves, canCreate flips true and the FAB enables.
      await waitFor(() => expect(fab).toBeEnabled());
    });

    it("renders exactly one Add recurring chore control on desktop, not a FAB", async () => {
      viewport.isMobile = false;
      seedMockChoresBoard(emptyChoresBoard());
      renderWithUser(<ChoresView />);
      const controls = await screen.findAllByRole("button", {
        name: "Add recurring chore",
      });
      expect(controls).toHaveLength(1);
      // Desktop keeps the inline icon button, never the floating action button.
      expect(controls[0]).not.toHaveClass("fixed");
    });
  });

  it("archives a recurring routine from the row action", async () => {
    let capturedUpdateBody: UpdateChoreTemplateRequest | null = null;
    server.use(
      http.patch(
        `${API_BASE}/chores/templates/brush-teeth-id`,
        async ({ request }) => {
          capturedUpdateBody =
            (await request.json()) as UpdateChoreTemplateRequest;
          return HttpResponse.json({
            data: {
              id: "brush-teeth-id",
              title: "Brush teeth",
              assignedToMemberId: "leo",
              cadence: "DAILY",
              activeFrom: "2026-05-17",
              archived: true,
              createdAt: "2026-05-17T08:00:00Z",
              updatedAt: "2026-05-17T09:05:00Z",
            },
          });
        },
      ),
    );
    seedMockChoresBoard(sampleChoresBoard());
    const { user } = renderWithUser(<ChoresView />);

    await user.click(
      await screen.findByRole("button", { name: /archive brush teeth/i }),
    );

    await waitFor(() => {
      expect(capturedUpdateBody).toEqual({ archived: true });
    });
  });
});
