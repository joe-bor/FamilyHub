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
import type { FamilyData, UpdateFamilyRequest } from "@/lib/types";
import { useHapticsPreference } from "@/stores";
import {
  API_BASE,
  resetMockFamily,
  seedMockFamily,
} from "@/test/mocks/handlers";
import { server } from "@/test/mocks/server";
import { render, renderWithUser, screen, waitFor } from "@/test/test-utils";
import { PreferencesSheet } from "./preferences-sheet";

// ============================================================================
// Test Setup
// ============================================================================

function baseFamily(timezone?: string): FamilyData {
  return {
    id: "family-1",
    name: "Test Family",
    timezone,
    members: [{ id: "member-1", name: "Alice", color: "coral" }],
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

function seedClient(family: FamilyData): QueryClient {
  seedMockFamily(family);
  const client = createClient();
  client.setQueryData<FamilyApiResponse>(familyKeys.family(), {
    data: family,
  });
  return client;
}

function getTimezoneSelect(): HTMLSelectElement {
  return screen.getByLabelText(/family timezone/i);
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

beforeEach(() => {
  resetMockFamily();
});

afterEach(() => {
  server.resetHandlers();
});

const noop = () => {};

// ============================================================================
// Timezone control
// ============================================================================

describe("PreferencesSheet — timezone", () => {
  it("shows the timezone from the family API, not a hardcoded default", () => {
    const client = seedClient(baseFamily("America/Chicago"));

    render(<PreferencesSheet open onOpenChange={noop} />, {
      queryClient: client,
    });

    expect(getTimezoneSelect().value).toBe("America/Chicago");
  });

  it("selects nothing while the timezone is not yet known", () => {
    // Pre-1.6.0 localStorage cache: family exists but carries no timezone.
    const client = seedClient(baseFamily(undefined));

    render(<PreferencesSheet open onOpenChange={noop} />, {
      queryClient: client,
    });

    expect(getTimezoneSelect().value).toBe("");
  });

  it("offers the current non-curated zone as a selectable option", () => {
    const client = seedClient(baseFamily("Asia/Manila"));

    render(<PreferencesSheet open onOpenChange={noop} />, {
      queryClient: client,
    });

    const select = getTimezoneSelect();
    expect(select.value).toBe("Asia/Manila");
    expect(
      screen.getByRole("option", { name: /asia\/manila/i }),
    ).toBeInTheDocument();
  });

  it("saves a curated zone through PUT /family and updates optimistically", async () => {
    const putBodies: UpdateFamilyRequest[] = [];
    server.use(
      http.put(`${API_BASE}/family`, async ({ request }) => {
        const body = (await request.json()) as UpdateFamilyRequest;
        putBodies.push(body);
        return HttpResponse.json({
          data: { ...baseFamily("America/Chicago"), ...body },
          message: "Family updated successfully",
        });
      }),
    );

    const client = seedClient(baseFamily("America/Chicago"));
    const { user } = renderWithUser(
      <PreferencesSheet open onOpenChange={noop} />,
      {
        queryClient: client,
      },
    );

    await user.selectOptions(getTimezoneSelect(), "America/New_York");

    await waitFor(() => {
      expect(putBodies).toEqual([{ timezone: "America/New_York" }]);
    });
    expect(getTimezoneSelect().value).toBe("America/New_York");
  });

  it("uses the device timezone via Intl when the detect action is pressed", async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "Pacific/Honolulu",
    } as Intl.ResolvedDateTimeFormatOptions);

    const putBodies: UpdateFamilyRequest[] = [];
    server.use(
      http.put(`${API_BASE}/family`, async ({ request }) => {
        const body = (await request.json()) as UpdateFamilyRequest;
        putBodies.push(body);
        return HttpResponse.json({
          data: { ...baseFamily("America/Chicago"), ...body },
          message: "Family updated successfully",
        });
      }),
    );

    const client = seedClient(baseFamily("America/Chicago"));
    const { user } = renderWithUser(
      <PreferencesSheet open onOpenChange={noop} />,
      {
        queryClient: client,
      },
    );

    await user.click(
      screen.getByRole("button", { name: /use this device's timezone/i }),
    );

    await waitFor(() => {
      expect(putBodies).toEqual([{ timezone: "Pacific/Honolulu" }]);
    });
    expect(getTimezoneSelect().value).toBe("Pacific/Honolulu");
  });

  it("surfaces a BE validation error inline and rolls back non-destructively", async () => {
    server.use(
      http.put(`${API_BASE}/family`, () =>
        HttpResponse.json(
          { message: "Timezone must be a valid IANA timezone." },
          { status: 400 },
        ),
      ),
    );

    const client = seedClient(baseFamily("America/Chicago"));
    const { user } = renderWithUser(
      <PreferencesSheet open onOpenChange={noop} />,
      {
        queryClient: client,
      },
    );

    await user.selectOptions(getTimezoneSelect(), "America/Denver");

    expect(
      await screen.findByText("Timezone must be a valid IANA timezone."),
    ).toBeInTheDocument();
    // Rolled back to the server-known value; the control stays usable.
    expect(getTimezoneSelect().value).toBe("America/Chicago");
    expect(getTimezoneSelect()).toBeEnabled();
  });
});

// ============================================================================
// Coming-soon stubs
// ============================================================================

describe("PreferencesSheet — roadmap stubs", () => {
  it("renders exactly two disabled Coming soon rows: Notifications and Appearance", () => {
    const client = seedClient(baseFamily("America/Chicago"));

    render(<PreferencesSheet open onOpenChange={noop} />, {
      queryClient: client,
    });

    // Exactly two stub rows — no additional stubs.
    const stubRows = screen.getAllByRole("button", { name: /coming soon/i });
    expect(stubRows).toHaveLength(2);

    const notifications = screen.getByRole("button", {
      name: /notifications/i,
    });
    const appearance = screen.getByRole("button", { name: /appearance/i });

    for (const row of [notifications, appearance]) {
      expect(row).toBeDisabled();
      expect(row).toHaveAttribute("aria-disabled", "true");
    }
  });
});

// ============================================================================
// Haptics helpers
// ============================================================================

function setVibrate(on: boolean) {
  if (on) {
    Object.defineProperty(navigator, "vibrate", {
      value: () => true,
      configurable: true,
      writable: true,
    });
  } else {
    delete (navigator as { vibrate?: unknown }).vibrate;
  }
}

// ============================================================================
// Breakpoints (mirrors responsive-form-dialog-breakpoint.test.tsx)
// ============================================================================

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });

  vi.mocked(window.matchMedia).mockImplementation((query: string) => {
    const maxWidth = Number.parseInt(
      query.match(/max-width:\s*(\d+)px/)?.[1] ?? "",
      10,
    );
    const minWidth = Number.parseInt(
      query.match(/min-width:\s*(\d+)px/)?.[1] ?? "",
      10,
    );

    const matchesMax = Number.isNaN(maxWidth) || width <= maxWidth;
    const matchesMin = Number.isNaN(minWidth) || width >= minWidth;

    return {
      matches: matchesMax && matchesMin,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });
}

describe("PreferencesSheet — breakpoints", () => {
  it("renders the full-height mobile sheet below the 768px md breakpoint", () => {
    setViewportWidth(767);
    const client = seedClient(baseFamily("America/Chicago"));

    render(<PreferencesSheet open onOpenChange={noop} />, {
      queryClient: client,
    });

    expect(
      screen.getByRole("dialog", { name: "Preferences" }),
    ).toBeInTheDocument();
    // The mobile sheet supplies the Cancel chrome.
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders the centered dialog at the 768px md breakpoint and up", () => {
    setViewportWidth(768);
    const client = seedClient(baseFamily("America/Chicago"));

    render(<PreferencesSheet open onOpenChange={noop} />, {
      queryClient: client,
    });

    expect(
      screen.getByRole("dialog", { name: "Preferences" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });
});

// ============================================================================
// Haptics section
// ============================================================================

describe("PreferencesSheet — Haptics section", () => {
  afterEach(() => setVibrate(false));

  it("is absent when navigator.vibrate is unsupported", () => {
    setVibrate(false);
    const client = seedClient(baseFamily("America/Chicago"));
    render(<PreferencesSheet open onOpenChange={noop} />, {
      queryClient: client,
    });
    expect(screen.queryByRole("heading", { name: /haptics/i })).toBeNull();
  });

  it("shows the master switch and reveals sub-switches when enabled", async () => {
    setVibrate(true);
    const client = seedClient(baseFamily("America/Chicago"));
    const { user } = renderWithUser(
      <PreferencesSheet open onOpenChange={noop} />,
      { queryClient: client },
    );
    expect(
      screen.getByRole("heading", { name: /haptics/i }),
    ).toBeInTheDocument();
    // sub-switches hidden while master is off
    expect(screen.queryByRole("switch", { name: /taps/i })).toBeNull();

    await user.click(screen.getByRole("switch", { name: /enable haptics/i }));
    expect(useHapticsPreference.getState().enabled).toBe(true);

    // sub-switches now visible; toggling one writes its category
    await user.click(screen.getByRole("switch", { name: /taps/i }));
    expect(useHapticsPreference.getState().categories.taps).toBe(false);
  });
});
