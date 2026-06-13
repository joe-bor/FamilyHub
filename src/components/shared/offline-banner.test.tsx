import { render, screen } from "@/test/test-utils";
import { OfflineBanner } from "./offline-banner";

let online = true;
vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return { ...actual, useOnlineStatus: () => online };
});

describe("OfflineBanner", () => {
  it("renders nothing when online", () => {
    online = true;
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an accessible status when offline", () => {
    online = false;
    render(<OfflineBanner />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/offline/i);
    expect(status).toHaveTextContent(/won't save/i);
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
