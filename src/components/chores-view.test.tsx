import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Chore } from "@/lib/types";
import { seedMockChores, setupMswServer } from "@/test/mocks/server";
import {
  render,
  renderWithUser,
  screen,
  seedFamilyStore,
  TEST_TIMEOUTS,
  typeAndWait,
  waitFor,
  waitForMemberSelected,
} from "@/test/test-utils";
import { ChoresView } from "./chores-view";

function createMockChore(
  overrides: Partial<Chore> &
    Pick<Chore, "id" | "title" | "assignedToMemberId">,
): Chore {
  return {
    id: overrides.id,
    title: overrides.title,
    assignedToMemberId: overrides.assignedToMemberId,
    dueDate: overrides.dueDate ?? null,
    completed: overrides.completed ?? false,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-05-05T09:00:00",
    updatedAt: overrides.updatedAt ?? "2026-05-05T09:00:00",
  };
}

describe("ChoresView", () => {
  setupMswServer();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 4, 5, 9, 0, 0));
    seedFamilyStore({
      members: [
        { id: "leo", name: "Leo", color: "coral" },
        { id: "maya", name: "Maya", color: "teal" },
      ],
    });
  });

  it("groups active chores by assignee and sorts incomplete chores by urgency", async () => {
    seedMockChores([
      createMockChore({
        id: "future",
        title: "Future",
        assignedToMemberId: "leo",
        dueDate: "2026-05-10",
      }),
      createMockChore({
        id: "overdue",
        title: "Overdue",
        assignedToMemberId: "leo",
        dueDate: "2026-05-01",
      }),
      createMockChore({
        id: "today",
        title: "Today",
        assignedToMemberId: "leo",
        dueDate: "2026-05-05",
      }),
      createMockChore({
        id: "no-date",
        title: "No date",
        assignedToMemberId: "leo",
      }),
      createMockChore({
        id: "done",
        title: "Done",
        assignedToMemberId: "leo",
        completed: true,
        completedAt: "2026-05-05T08:00:00",
      }),
      createMockChore({
        id: "maya-done",
        title: "Maya done",
        assignedToMemberId: "maya",
        completed: true,
        completedAt: "2026-05-05T08:30:00",
      }),
    ]);

    render(<ChoresView />);

    expect(await screen.findByRole("heading", { name: "Leo" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Maya" }),
    ).not.toBeInTheDocument();

    const rows = await screen.findAllByTestId(/chore-row-/);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Overdue"),
      expect.stringContaining("Today"),
      expect.stringContaining("Future"),
      expect.stringContaining("No date"),
      expect.stringContaining("Done"),
    ]);
    expect(rows.at(-1)).toHaveClass("bg-muted/40");
    expect(
      screen.getByRole("progressbar", { name: /leo progress/i }),
    ).toHaveAttribute("aria-valuenow", "20");
  });

  it("shows completed-only lanes in the all caught up state", async () => {
    seedMockChores([
      createMockChore({
        id: "leo-done",
        title: "Leo done",
        assignedToMemberId: "leo",
        completed: true,
        completedAt: "2026-05-05T08:00:00",
      }),
      createMockChore({
        id: "maya-done",
        title: "Maya done",
        assignedToMemberId: "maya",
        completed: true,
        completedAt: "2026-05-05T08:30:00",
      }),
    ]);

    render(<ChoresView />);

    expect(await screen.findByText("All caught up")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Leo" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Maya" })).toBeVisible();
    expect(screen.getByTestId("chore-row-leo-done")).toHaveClass("bg-muted/40");
    expect(screen.getByTestId("chore-row-maya-done")).toHaveClass(
      "bg-muted/40",
    );
  });

  it("opens the full-screen create sheet and adds a chore", async () => {
    seedMockChores([]);
    const { user } = renderWithUser(<ChoresView />);

    expect(await screen.findByText("No chores yet")).toBeVisible();
    const addButtons = screen.getAllByRole("button", { name: /add chore/i });
    await user.click(addButtons[addButtons.length - 1]);

    expect(screen.getByRole("dialog", { name: "New Chore" })).toHaveClass(
      "fixed",
      "inset-0",
      "z-50",
    );
    await waitForMemberSelected("Leo");
    await typeAndWait(
      user,
      screen.getByLabelText(/chore name/i),
      "Take out trash",
    );
    await user.click(screen.getByRole("button", { name: /save chore/i }));

    expect(await screen.findByText("Take out trash")).toBeVisible();
    await waitFor(
      () => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      },
      { timeout: TEST_TIMEOUTS.DIALOG_READY },
    );
  });

  it("supports complete, uncomplete, and delete", async () => {
    seedMockChores([
      createMockChore({
        id: "trash",
        title: "Take out trash",
        assignedToMemberId: "leo",
      }),
    ]);
    const { user } = renderWithUser(<ChoresView />);

    expect(await screen.findByText("Take out trash")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: /mark take out trash complete/i }),
    );
    expect(
      await screen.findByRole("button", {
        name: /mark take out trash incomplete/i,
      }),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: /mark take out trash incomplete/i }),
    );
    expect(
      await screen.findByRole("button", {
        name: /mark take out trash complete/i,
      }),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: /delete take out trash/i }),
    );

    await waitFor(() => {
      expect(screen.queryByText("Take out trash")).not.toBeInTheDocument();
    });
  });
});
