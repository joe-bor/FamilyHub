/**
 * Dedicated test for the mobile Options→manager handoff SEQUENCING (Task 11).
 *
 * Why a separate file: this test mocks `../ui/mobile-sheet` to capture the
 * `onAnimationEnd` prop and invoke it directly. `vi.mock` is hoisted to the
 * top of the module, so the mock applies to the ENTIRE file. Keeping it here
 * (instead of in list-detail-view.test.tsx, which renders the real MobileSheet)
 * isolates the mock so the real-drawer tests in that file stay untouched.
 *
 * jsdom limitation this works around: vaul's onAnimationEnd fires via a 500ms
 * setTimeout that never reliably fires under jsdom's mocked WAAPI. We don't need
 * the real drawer to prove the sequencing — we capture the prop the component
 * wires and invoke it deterministically.
 */

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListDetail } from "@/lib/types";
import {
  seedMockCategoryCatalog,
  seedMockListPreferences,
  seedMockLists,
  setupMswServer,
} from "@/test/mocks/server";
import { act, renderWithUser, screen, waitFor } from "@/test/test-utils";
import { ListDetailView } from "./list-detail-view";

const viewport = vi.hoisted(() => ({ isMobile: true }));

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return {
    ...actual,
    useIsMobile: () => viewport.isMobile,
  };
});

// Faithful MobileSheet stand-in: renders children + a labelled dialog when open,
// exposes a Cancel affordance that calls onClose, and captures onAnimationEnd so
// the test can drive the close-animation-complete callback deterministically.
const animationEndByTitle = vi.hoisted(
  () => new Map<string, (open: boolean) => void>(),
);

vi.mock("../ui/mobile-sheet", () => ({
  MobileSheet: ({
    isOpen,
    onClose,
    title,
    children,
    onAnimationEnd,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    onAnimationEnd?: (open: boolean) => void;
  }) => {
    // Capture the latest onAnimationEnd for this sheet (keyed by title) so the
    // test can invoke it after the close.
    if (onAnimationEnd) animationEndByTitle.set(title, onAnimationEnd);
    if (!isOpen) return null;
    return (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        {children}
      </div>
    );
  },
}));

const LIST_ID = "00000000-0000-4000-8000-000000000101";

const groceryList: ListDetail = {
  id: LIST_ID,
  name: "Trader Joe's Run",
  kind: "grocery",
  categoryDisplayMode: "grouped",
  showCompletedOverride: null,
  categories: [
    {
      id: "00000000-0000-4000-8000-000000000301",
      kind: "grocery",
      name: "Produce",
      sortOrder: 0,
    },
  ],
  items: [
    {
      id: "00000000-0000-4000-8000-000000000201",
      text: "Bananas",
      completed: false,
      completedAt: null,
      categoryId: "00000000-0000-4000-8000-000000000301",
      createdAt: "2026-05-06T09:05:00",
      updatedAt: "2026-05-06T09:05:00",
    },
  ],
  createdAt: "2026-05-06T09:00:00",
  updatedAt: "2026-05-06T10:00:00",
};

setupMswServer();

beforeEach(() => {
  viewport.isMobile = true;
  animationEndByTitle.clear();
  seedMockLists([groceryList]);
  seedMockListPreferences({ showCompletedByDefault: true });
  seedMockCategoryCatalog("grocery", [
    {
      id: "00000000-0000-4000-8000-000000000301",
      kind: "grocery",
      name: "Produce",
      sortOrder: 0,
    },
  ]);
});

function renderDetail() {
  return renderWithUser(
    <ListDetailView
      listId={LIST_ID}
      preferences={{ showCompletedByDefault: true }}
      preferencesStatus="ready"
      onBack={() => {}}
    />,
  );
}

describe("mobile Options→manager handoff sequencing (Task 11)", () => {
  it("opens the manager ONLY after the Options close animation completes", async () => {
    const { user } = renderDetail();
    await screen.findByRole("heading", { name: "Trader Joe's Run" });

    // Open the Options sheet
    await user.click(screen.getByRole("button", { name: "List options" }));
    await screen.findByRole("dialog", { name: "List options" });

    // Manager is not mounted yet
    expect(
      screen.queryByRole("dialog", { name: /grocery categories/i }),
    ).toBeNull();

    // Click "Manage categories" inside the Options sheet
    await user.click(
      screen.getByRole("button", { name: /manage categories/i }),
    );

    // DEFERRAL: the Options sheet begins closing (its isOpen flips to false, so
    // the mocked sheet unmounts), and the manager is NOT yet open. This is the
    // first half of the handoff — managerOpen is still false.
    expect(screen.queryByRole("dialog", { name: "List options" })).toBeNull();
    expect(
      screen.queryByRole("dialog", { name: /grocery categories/i }),
    ).toBeNull();

    // Drive the close-animation-complete callback exactly as vaul would
    // (onAnimationEnd(false)). This is what the component wires to open the manager.
    const optionsOnAnimationEnd = animationEndByTitle.get("List options");
    expect(optionsOnAnimationEnd).toBeDefined();
    act(() => {
      optionsOnAnimationEnd?.(false);
    });

    // NOW the manager is present…
    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: /grocery categories/i }),
      ).toBeInTheDocument();
    });

    // …AND the Options sheet content is gone at the moment the manager opens
    // (the no-stacking invariant: never two sheets at once).
    expect(screen.queryByRole("dialog", { name: "List options" })).toBeNull();
  });

  it("does NOT open the manager if Options is re-opened before the close animation finishes", async () => {
    // Race: user clicks Manage (pending=true, Options begins closing), then changes
    // their mind and re-opens Options before vaul's close animation completes.
    // The stale onAnimationEnd(false) must NOT pop the manager open afterward,
    // because re-opening Options clears managerHandoffPending.
    const { user } = renderDetail();
    await screen.findByRole("heading", { name: "Trader Joe's Run" });

    // Open Options, then click Manage categories (sets pending, starts closing).
    await user.click(screen.getByRole("button", { name: "List options" }));
    await screen.findByRole("dialog", { name: "List options" });
    await user.click(
      screen.getByRole("button", { name: /manage categories/i }),
    );

    // Options closing; manager not open yet.
    expect(screen.queryByRole("dialog", { name: "List options" })).toBeNull();
    expect(
      screen.queryByRole("dialog", { name: /grocery categories/i }),
    ).toBeNull();

    // User RE-OPENS Options before the animation finishes — this clears pending.
    await user.click(screen.getByRole("button", { name: "List options" }));
    await screen.findByRole("dialog", { name: "List options" });

    // Now the (stale) close-animation callback from the earlier close fires.
    const optionsOnAnimationEnd = animationEndByTitle.get("List options");
    expect(optionsOnAnimationEnd).toBeDefined();
    act(() => {
      optionsOnAnimationEnd?.(false);
    });

    // The manager must NOT open — the handoff was cancelled by the re-open.
    expect(
      screen.queryByRole("dialog", { name: /grocery categories/i }),
    ).toBeNull();
    // Options remains open (it's the sheet the user actually wants).
    expect(
      screen.getByRole("dialog", { name: "List options" }),
    ).toBeInTheDocument();
  });

  it("opens the manager via fallback if the close animation callback never fires", async () => {
    const { user } = renderDetail();
    await screen.findByRole("heading", { name: "Trader Joe's Run" });

    await user.click(screen.getByRole("button", { name: "List options" }));
    await screen.findByRole("dialog", { name: "List options" });
    await user.click(
      screen.getByRole("button", { name: /manage categories/i }),
    );

    expect(screen.queryByRole("dialog", { name: "List options" })).toBeNull();
    expect(
      screen.queryByRole("dialog", { name: /grocery categories/i }),
    ).toBeNull();

    await waitFor(
      () => {
        expect(
          screen.getByRole("dialog", { name: /grocery categories/i }),
        ).toBeInTheDocument();
      },
      { timeout: 1200 },
    );
  });
});
