import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { LoginForm } from "./login-form";

let mockIsMobile = true;
vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return { ...actual, useIsMobile: () => mockIsMobile };
});

describe("LoginForm", () => {
  beforeEach(() => {
    mockIsMobile = true;
  });

  it("does not autofocus the username field on mobile", () => {
    render(<LoginForm onSwitchToOnboarding={vi.fn()} />);
    expect(screen.getByLabelText(/username/i)).not.toBe(document.activeElement);
  });

  it("autofocuses the username field on desktop", () => {
    mockIsMobile = false;
    render(<LoginForm onSwitchToOnboarding={vi.fn()} />);
    expect(screen.getByLabelText(/username/i)).toBe(document.activeElement);
  });
});
