import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { API_BASE, server, setupMswServer } from "@/test/mocks/server";
import { render, screen } from "@/test/test-utils";
import { GoogleCalendarSection } from "./google-calendar-section";

const MEMBER_ID = "member-123";

setupMswServer();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("GoogleCalendarSection", () => {
  describe("disconnected state", () => {
    beforeEach(() => {
      server.use(
        http.get(`${API_BASE}/google/status/${MEMBER_ID}`, () =>
          HttpResponse.json({
            data: { connected: false, calendars: [] },
            message: null,
          }),
        ),
      );
    });

    it("shows connect button when member has email", async () => {
      render(
        <GoogleCalendarSection
          memberId={MEMBER_ID}
          memberEmail="test@example.com"
          memberName="Alice"
        />,
        { wrapper: createWrapper() },
      );

      expect(
        await screen.findByRole("button", { name: /connect google calendar/i }),
      ).toBeInTheDocument();
    });

    it("disables connect button when member has no email", async () => {
      render(
        <GoogleCalendarSection
          memberId={MEMBER_ID}
          memberEmail=""
          memberName="Alice"
        />,
        { wrapper: createWrapper() },
      );

      const button = await screen.findByRole("button", {
        name: /connect google calendar/i,
      });
      expect(button).toBeDisabled();
      expect(screen.getByText(/add an email/i)).toBeInTheDocument();
    });
  });

  describe("connected state", () => {
    beforeEach(() => {
      server.use(
        http.get(`${API_BASE}/google/status/${MEMBER_ID}`, () =>
          HttpResponse.json({
            data: {
              connected: true,
              calendars: [
                {
                  id: "primary",
                  name: "Main Calendar",
                  enabled: true,
                  lastSyncedAt: "2026-03-20T10:00:00Z",
                },
              ],
            },
            message: null,
          }),
        ),
      );
    });

    it("shows connected status and action buttons", async () => {
      render(
        <GoogleCalendarSection
          memberId={MEMBER_ID}
          memberEmail="test@example.com"
          memberName="Alice"
        />,
        { wrapper: createWrapper() },
      );

      expect(await screen.findByText(/connected/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /choose calendars/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sync now/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /disconnect/i }),
      ).toBeInTheDocument();
    });
  });
});
