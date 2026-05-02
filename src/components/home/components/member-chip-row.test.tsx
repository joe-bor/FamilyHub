import { useState } from "react";
import { testMembers } from "@/test/fixtures";
import { renderWithUser, screen } from "@/test/test-utils";
import { MemberChipRow } from "./member-chip-row";

describe("MemberChipRow", () => {
  it("toggles single-member focus", async () => {
    const onFocusChange = vi.fn();
    function ControlledRow() {
      const [focusedId, setFocusedId] = useState<string | null>(null);

      return (
        <MemberChipRow
          members={testMembers}
          focusedId={focusedId}
          onFocusChange={(id) => {
            onFocusChange(id);
            setFocusedId(id);
          }}
        />
      );
    }

    const { user } = renderWithUser(<ControlledRow />);

    await user.click(
      screen.getByRole("button", { name: "Focus on John's events" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Focus on John's events" }),
    );

    expect(onFocusChange).toHaveBeenNthCalledWith(1, testMembers[0].id);
    expect(onFocusChange).toHaveBeenNthCalledWith(2, null);
  });

  it("marks the selected chip and dims the others", () => {
    renderWithUser(
      <MemberChipRow
        members={testMembers}
        focusedId={testMembers[1].id}
        onFocusChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Focus on Jane's events" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Focus on John's events" }),
    ).toHaveClass("opacity-55");
  });
});
