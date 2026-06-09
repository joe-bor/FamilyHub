import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { OnboardingFamilyName } from "./onboarding-family-name";

let mockIsMobile = true;
vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return { ...actual, useIsMobile: () => mockIsMobile };
});

describe("OnboardingFamilyName", () => {
  beforeEach(() => {
    mockIsMobile = true;
  });

  it("does not autofocus the family-name field on mobile", () => {
    render(
      <OnboardingFamilyName initialName="" onNext={vi.fn()} onBack={vi.fn()} />,
    );
    expect(screen.getByLabelText(/family name/i)).not.toBe(
      document.activeElement,
    );
  });

  it("autofocuses the family-name field on desktop", () => {
    mockIsMobile = false;
    render(
      <OnboardingFamilyName initialName="" onNext={vi.fn()} onBack={vi.fn()} />,
    );
    expect(screen.getByLabelText(/family name/i)).toBe(document.activeElement);
  });
});
