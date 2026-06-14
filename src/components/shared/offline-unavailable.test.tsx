import { render, screen } from "@/test/test-utils";
import { OfflineUnavailable } from "./offline-unavailable";

let online = true;
vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return { ...actual, useOnlineStatus: () => online };
});

describe("OfflineUnavailable", () => {
  it("renders nothing when online (defers to the module's own states)", () => {
    online = true;
    const { container } = render(<OfflineUnavailable label="meals" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a clear offline empty state when offline", () => {
    online = false;
    render(<OfflineUnavailable label="meals" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/offline/i);
    expect(status).toHaveTextContent(/meals/i);
  });
});
