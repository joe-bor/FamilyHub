import { describe, expect, it, vi } from "vitest";
import { renderWithUser, screen } from "@/test/test-utils";
import { EditScopeDialog } from "./edit-scope-dialog";

describe("EditScopeDialog", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    action: "edit" as const,
  };

  it("renders edit title and scope options", () => {
    renderWithUser(<EditScopeDialog {...defaultProps} />);

    expect(screen.getByText("Edit recurring event")).toBeInTheDocument();
    expect(screen.getByLabelText("This event")).toBeInTheDocument();
    expect(screen.getByLabelText("All events")).toBeInTheDocument();
  });

  it("renders delete title when action is delete", () => {
    renderWithUser(<EditScopeDialog {...defaultProps} action="delete" />);

    expect(screen.getByText("Delete recurring event")).toBeInTheDocument();
  });

  it("defaults to 'this' scope", () => {
    renderWithUser(<EditScopeDialog {...defaultProps} />);

    const thisRadio = screen.getByLabelText("This event");
    expect(thisRadio).toBeChecked();
  });

  it("calls onSelect with chosen scope when OK clicked", async () => {
    const onSelect = vi.fn();
    const { user } = renderWithUser(
      <EditScopeDialog {...defaultProps} onSelect={onSelect} />,
    );

    await user.click(screen.getByLabelText("All events"));
    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(onSelect).toHaveBeenCalledWith("all");
  });

  it("calls onClose when Cancel clicked", async () => {
    const onClose = vi.fn();
    const { user } = renderWithUser(
      <EditScopeDialog {...defaultProps} onClose={onClose} />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
  });
});
