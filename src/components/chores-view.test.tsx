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

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useIsMobile: () => viewport.isMobile,
  };
});

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
    seedFamilyStore({
      members: [
        { id: "leo", name: "Leo", color: "coral" },
        { id: "maya", name: "Maya", color: "teal" },
      ],
    });
  });

  it("shows one selected scope at a time on mobile", async () => {
    viewport.isMobile = true;
    seedMockChoresBoard(sampleChoresBoard());

    const { user } = renderWithUser(<ChoresView />);

    expect(await screen.findByRole("button", { name: "Day" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await screen.findByRole("heading", { name: "Today" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "This Week" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Week" }));

    expect(screen.getByRole("heading", { name: "This Week" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Today" }),
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
