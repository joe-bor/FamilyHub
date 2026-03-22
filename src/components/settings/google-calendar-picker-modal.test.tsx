import { screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { API_BASE, server, setupMswServer } from "@/test/mocks/server";
import { render } from "@/test/test-utils";
import { GoogleCalendarPickerModal } from "./google-calendar-picker-modal";

const MEMBER_ID = "member-123";

setupMswServer();

describe("GoogleCalendarPickerModal", () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/google/calendars/${MEMBER_ID}`, () =>
        HttpResponse.json({
          data: [
            {
              id: "primary",
              name: "Main Calendar",
              primary: true,
              enabled: true,
            },
            {
              id: "work@group.calendar.google.com",
              name: "Work",
              primary: false,
              enabled: false,
            },
          ],
          message: null,
        }),
      ),
    );
  });

  it("shows calendars with checkboxes", async () => {
    render(
      <GoogleCalendarPickerModal
        open={true}
        onOpenChange={vi.fn()}
        memberId={MEMBER_ID}
      />,
    );

    expect(await screen.findByText(/Main Calendar/i)).toBeInTheDocument();
    expect(screen.getByText(/\(Primary\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Work/i)).toBeInTheDocument();
  });

  it("primary calendar is checked, non-enabled is unchecked", async () => {
    render(
      <GoogleCalendarPickerModal
        open={true}
        onOpenChange={vi.fn()}
        memberId={MEMBER_ID}
      />,
    );

    const checkboxes = await screen.findAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked(); // Main Calendar — enabled: true
    expect(checkboxes[1]).not.toBeChecked(); // Work — enabled: false
  });
});
