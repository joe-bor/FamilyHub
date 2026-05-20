import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChoresBoard } from "@/lib/types";
import { seedMockChoresBoard, setupMswServer } from "@/test/mocks/server";
import {
  render,
  renderWithUser,
  screen,
  seedFamilyStore,
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
});
