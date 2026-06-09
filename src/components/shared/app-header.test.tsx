import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, seedFamilyStore } from "@/test/test-utils";
import { AppHeader } from "./app-header";

vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return { ...actual, useIsMobile: () => true };
});

describe("AppHeader (mobile)", () => {
  beforeEach(() => {
    seedFamilyStore({
      name: "Test Family",
      members: [{ id: "m1", name: "Alice", color: "coral" }],
    });
  });

  it("exposes exactly one header control: Menu", () => {
    render(<AppHeader />);
    expect(screen.getByRole("button", { name: /menu/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
