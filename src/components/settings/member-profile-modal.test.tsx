import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import type { FamilyMember, UpdateMemberRequest } from "@/lib/types";
import { API_BASE, setupMswServer } from "@/test/mocks/server";
import {
  render,
  renderWithUser,
  screen,
  seedFamilyStore,
  TEST_TIMEOUTS,
  waitFor,
} from "@/test/test-utils";
import { MemberProfileModal } from "./member-profile-modal";

setupMswServer();

const testMember: FamilyMember = {
  id: "member-1",
  name: "Alice",
  color: "coral",
  avatarUrl: "https://example.com/avatar.jpg",
  email: "alice@example.com",
};

const testMembers: FamilyMember[] = [
  testMember,
  { id: "member-2", name: "Bob", color: "teal" },
];

function seedFamily() {
  seedFamilyStore({ name: "Test Family", members: testMembers });
}

describe("MemberProfileModal", () => {
  it("form submit preserves avatarUrl from existing member data", async () => {
    seedFamily();
    let capturedBody: UpdateMemberRequest | null = null;

    const { server } = await import("@/test/mocks/server");
    server.use(
      http.put(`${API_BASE}/family/members/:id`, async ({ request }) => {
        capturedBody = (await request.json()) as UpdateMemberRequest;
        return HttpResponse.json({
          data: { ...testMember, ...capturedBody },
          message: "Member updated",
        });
      }),
    );

    const { user } = renderWithUser(
      <MemberProfileModal
        open={true}
        onOpenChange={vi.fn()}
        memberId="member-1"
      />,
    );

    // Change name to make form dirty
    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Alice Updated");

    await waitFor(
      () => {
        expect(nameInput).toHaveValue("Alice Updated");
      },
      { timeout: TEST_TIMEOUTS.FORM_STATE },
    );

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(
      () => {
        expect(capturedBody).not.toBeNull();
      },
      { timeout: TEST_TIMEOUTS.FORM_SUBMIT },
    );

    expect(capturedBody).toMatchObject({
      name: "Alice Updated",
      color: "coral",
      avatarUrl: "https://example.com/avatar.jpg",
    });
  });

  it("avatar upload sends all fields including base64 avatarUrl", async () => {
    seedFamily();
    let capturedBody: UpdateMemberRequest | null = null;

    const { server } = await import("@/test/mocks/server");
    server.use(
      http.put(`${API_BASE}/family/members/:id`, async ({ request }) => {
        capturedBody = (await request.json()) as UpdateMemberRequest;
        return HttpResponse.json({
          data: { ...testMember, ...capturedBody },
          message: "Member updated",
        });
      }),
    );

    render(
      <MemberProfileModal
        open={true}
        onOpenChange={vi.fn()}
        memberId="member-1"
      />,
    );

    const fileInput = screen.getByLabelText("Upload avatar image");
    const file = new File(["fake-image-content"], "photo.png", {
      type: "image/png",
    });

    // Simulate upload via fireEvent (userEvent.upload can be flaky with hidden inputs)
    Object.defineProperty(fileInput, "files", { value: [file] });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    await waitFor(
      () => {
        expect(capturedBody).not.toBeNull();
      },
      { timeout: TEST_TIMEOUTS.FORM_SUBMIT },
    );

    expect(capturedBody!.name).toBe("Alice");
    expect(capturedBody!.color).toBe("coral");
    expect(capturedBody!.avatarUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("avatar removal sends avatarUrl: null", async () => {
    seedFamily();
    let capturedBody: UpdateMemberRequest | null = null;

    const { server } = await import("@/test/mocks/server");
    server.use(
      http.put(`${API_BASE}/family/members/:id`, async ({ request }) => {
        capturedBody = (await request.json()) as UpdateMemberRequest;
        return HttpResponse.json({
          data: { ...testMember, avatarUrl: undefined },
          message: "Member updated",
        });
      }),
    );

    const { user } = renderWithUser(
      <MemberProfileModal
        open={true}
        onOpenChange={vi.fn()}
        memberId="member-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: /remove photo/i }));

    await waitFor(
      () => {
        expect(capturedBody).not.toBeNull();
      },
      { timeout: TEST_TIMEOUTS.FORM_SUBMIT },
    );

    expect(capturedBody).toMatchObject({
      name: "Alice",
      color: "coral",
      avatarUrl: null,
    });
  });

  it("shows error for invalid file type", async () => {
    seedFamily();

    render(
      <MemberProfileModal
        open={true}
        onOpenChange={vi.fn()}
        memberId="member-1"
      />,
    );

    const fileInput = screen.getByLabelText("Upload avatar image");
    const file = new File(["not-an-image"], "readme.txt", {
      type: "text/plain",
    });

    Object.defineProperty(fileInput, "files", { value: [file] });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(
      await screen.findByText("Please select an image file"),
    ).toBeInTheDocument();
  });

  it("shows error for oversized file", async () => {
    seedFamily();

    render(
      <MemberProfileModal
        open={true}
        onOpenChange={vi.fn()}
        memberId="member-1"
      />,
    );

    const fileInput = screen.getByLabelText("Upload avatar image");
    // Create a file larger than 500KB
    const bigContent = new Uint8Array(501 * 1024);
    const file = new File([bigContent], "big-photo.png", {
      type: "image/png",
    });

    Object.defineProperty(fileInput, "files", { value: [file] });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(
      await screen.findByText("Image must be smaller than 500KB"),
    ).toBeInTheDocument();
  });
});
