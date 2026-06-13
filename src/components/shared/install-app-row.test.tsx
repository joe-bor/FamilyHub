import { render, renderWithUser, screen } from "@/test/test-utils";
import { InstallAppRow } from "./install-app-row";

let standalone = false;
let canInstall = false;
const promptInstall = vi.fn();

vi.mock("@/lib/pwa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/pwa")>();
  return { ...actual, isStandalone: () => standalone };
});
vi.mock("@/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks")>();
  return { ...actual, useInstallPrompt: () => ({ canInstall, promptInstall }) };
});

describe("InstallAppRow", () => {
  it("renders nothing when already installed", () => {
    standalone = true;
    canInstall = false;
    const { container } = render(<InstallAppRow />);
    expect(container).toBeEmptyDOMElement();
  });

  it("one-taps install on Chromium", async () => {
    standalone = false;
    canInstall = true;
    const { user } = renderWithUser(<InstallAppRow />);
    await user.click(screen.getByRole("button", { name: /install app/i }));
    expect(promptInstall).toHaveBeenCalledOnce();
  });

  it("opens the instructions sheet when no install prompt is available", async () => {
    standalone = false;
    canInstall = false;
    const { user } = renderWithUser(<InstallAppRow />);
    await user.click(screen.getByRole("button", { name: /install app/i }));
    expect(await screen.findByText(/install family hub/i)).toBeInTheDocument();
  });
});
