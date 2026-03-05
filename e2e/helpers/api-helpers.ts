import type { APIRequestContext, Page } from "@playwright/test";
import type { FamilyColor } from "../../src/lib/types/family";

const API_BASE = "http://localhost:8080/api";

interface RegisterOptions {
  familyName: string;
  members: Array<{ name: string; color: FamilyColor }>;
}

interface RegistrationResult {
  token: string;
  family: {
    id: string;
    name: string;
    members: Array<{ id: string; name: string; color: FamilyColor }>;
    createdAt: string;
  };
}

/**
 * Register a new family via the real backend API.
 * Generates a unique username per call to avoid conflicts.
 */
export async function registerFamily(
  request: APIRequestContext,
  options: RegisterOptions,
): Promise<RegistrationResult> {
  // BE validates: lowercase letters, numbers, underscores only, 3-20 chars
  const unique = Math.random().toString(36).slice(2, 10);
  const username = `t_${unique}`;

  const response = await request.post(`${API_BASE}/auth/register`, {
    data: {
      username,
      password: "TestPassword123!",
      familyName: options.familyName,
      members: options.members,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Registration failed (${response.status()}): ${body}`);
  }

  const json = await response.json();
  return json.data;
}

/**
 * Seed browser localStorage with real auth token and family data.
 * Must be called after page.goto() but before reload.
 */
export async function seedBrowserAuth(
  page: Page,
  registration: RegistrationResult,
): Promise<void> {
  await page.evaluate(({ token, family }) => {
    // Auth token — same key the app reads
    localStorage.setItem("family-hub-auth-token", token);

    // Family data — Zustand persist format
    localStorage.setItem(
      "family-hub-family",
      JSON.stringify({
        state: { family, _hasHydrated: true },
        version: 0,
      }),
    );
  }, registration);
}

/**
 * Create a calendar event via the real backend API.
 */
export async function createEventViaApi(
  request: APIRequestContext,
  token: string,
  eventData: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    memberId: string;
  },
): Promise<void> {
  const response = await request.post(`${API_BASE}/calendar/events`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: eventData,
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Create event failed (${response.status()}): ${body}`);
  }
}
