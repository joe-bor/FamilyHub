import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll } from "vitest";
import type { GoogleCalendarInfo } from "@/lib/types";
import { server } from "@/test/mocks/server";
import { googleCalendarService } from "./google-calendar.service";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const MEMBER_ID = "member-123";

describe("googleCalendarService", () => {
  describe("getAuthUrl", () => {
    it("returns the OAuth redirect URL", async () => {
      server.use(
        http.get("*/google/auth", () =>
          HttpResponse.json({
            data: { url: "https://accounts.google.com/o/oauth2/v2/auth?..." },
            message: null,
          }),
        ),
      );

      const result = await googleCalendarService.getAuthUrl(MEMBER_ID);
      expect(result.data.url).toContain("accounts.google.com");
    });
  });

  describe("getConnectionStatus", () => {
    it("returns connection status for a member", async () => {
      server.use(
        http.get(`*/google/status/${MEMBER_ID}`, () =>
          HttpResponse.json({
            data: { connected: true, calendars: [] },
            message: null,
          }),
        ),
      );

      const result = await googleCalendarService.getConnectionStatus(MEMBER_ID);
      expect(result.data.connected).toBe(true);
    });
  });

  describe("disconnect", () => {
    it("calls DELETE endpoint", async () => {
      server.use(
        http.delete(
          `*/google/disconnect/${MEMBER_ID}`,
          () => new HttpResponse(null, { status: 204 }),
        ),
      );

      await expect(
        googleCalendarService.disconnect(MEMBER_ID),
      ).resolves.not.toThrow();
    });
  });

  describe("getCalendars", () => {
    it("returns calendars for a member", async () => {
      const mockCalendars: GoogleCalendarInfo[] = [
        { id: "cal-1", name: "Personal", primary: true, enabled: true },
        { id: "cal-2", name: "Work", primary: false, enabled: false },
      ];

      server.use(
        http.get(`*/google/calendars/${MEMBER_ID}`, () =>
          HttpResponse.json({
            data: mockCalendars,
            message: null,
          }),
        ),
      );

      const result = await googleCalendarService.getCalendars(MEMBER_ID);
      expect(result.data).toEqual(mockCalendars);
      expect(result.data).toHaveLength(2);
    });
  });

  describe("updateCalendars", () => {
    it("sends selected calendar IDs and returns updated calendars", async () => {
      const selectedIds = ["cal-1", "cal-3"];
      const updatedCalendars: GoogleCalendarInfo[] = [
        { id: "cal-1", name: "Personal", primary: true, enabled: true },
        { id: "cal-2", name: "Work", primary: false, enabled: false },
        { id: "cal-3", name: "Holidays", primary: false, enabled: true },
      ];

      let capturedBody: unknown;

      server.use(
        http.put(`*/google/calendars/${MEMBER_ID}`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            data: updatedCalendars,
            message: null,
          });
        }),
      );

      const result = await googleCalendarService.updateCalendars(
        MEMBER_ID,
        selectedIds,
      );
      expect(capturedBody).toEqual({ calendarIds: selectedIds });
      expect(result.data).toEqual(updatedCalendars);
    });
  });

  describe("syncCalendar", () => {
    it("calls POST endpoint and returns 202 Accepted", async () => {
      server.use(
        http.post(`*/google/sync/${MEMBER_ID}`, () =>
          HttpResponse.json(
            {
              data: null,
              message: "Sync started",
            },
            { status: 202 },
          ),
        ),
      );

      const result = await googleCalendarService.syncCalendar(MEMBER_ID);
      expect(result).toEqual({ data: null, message: "Sync started" });
    });
  });
});
