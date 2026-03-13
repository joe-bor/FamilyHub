import { describe, expect, it, vi } from "vitest";
import { renderWithUser, screen } from "@/test/test-utils";
import { RecurrencePicker } from "./recurrence-picker";

const render = (ui: React.ReactElement) => renderWithUser(ui);

describe("RecurrencePicker", () => {
  const defaultProps = {
    frequency: "none" as const,
    interval: 1,
    eventDate: "2026-03-11", // Wednesday
    onChange: vi.fn(),
  };

  it("renders frequency dropdown with correct options", () => {
    render(<RecurrencePicker {...defaultProps} />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(5);
    expect(options[0]).toHaveTextContent("Does not repeat");
    expect(options[1]).toHaveTextContent("Daily");
    expect(options[2]).toHaveTextContent("Weekly on Wednesday");
    expect(options[3]).toHaveTextContent("Weekly on custom days...");
    expect(options[4]).toHaveTextContent("Monthly on the 11th");
  });

  it("updates day name when eventDate changes", () => {
    render(<RecurrencePicker {...defaultProps} eventDate="2026-03-13" />);
    // March 13 2026 is a Friday
    expect(screen.getByText(/Weekly on Friday/)).toBeInTheDocument();
  });

  it("does not show day toggles or interval when none selected", () => {
    render(<RecurrencePicker {...defaultProps} />);
    expect(screen.queryByLabelText("MO")).not.toBeInTheDocument();
    expect(screen.queryByText("Every")).not.toBeInTheDocument();
  });

  it("shows interval and end date controls when daily selected", () => {
    render(<RecurrencePicker {...defaultProps} frequency="daily" />);
    expect(screen.getByText("Every")).toBeInTheDocument();
    expect(screen.getByText("Ends")).toBeInTheDocument();
    expect(screen.getByLabelText("Never")).toBeInTheDocument();
    expect(screen.getByLabelText("On date")).toBeInTheDocument();
  });

  it("shows day toggles when weekly-custom is active", () => {
    render(
      <RecurrencePicker
        {...defaultProps}
        frequency="weekly"
        weeklyDays={["TU", "TH"]}
      />,
    );
    expect(screen.getByLabelText("MO")).toBeInTheDocument();
    expect(screen.getByLabelText("TU")).toBeInTheDocument();
    // TU and TH should be pressed
    expect(screen.getByLabelText("TU")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("TH")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("MO")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onChange when day toggle is clicked", async () => {
    const onChange = vi.fn();
    const { user } = render(
      <RecurrencePicker
        {...defaultProps}
        frequency="weekly"
        weeklyDays={["TU"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByLabelText("FR"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        frequency: "weekly",
        weeklyDays: ["TU", "FR"],
      }),
    );
  });

  it("shows end date picker when 'On date' is selected", async () => {
    const onChange = vi.fn();
    const { user } = render(
      <RecurrencePicker
        {...defaultProps}
        frequency="daily"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByLabelText("On date"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        endDate: "2026-03-11", // defaults to eventDate
      }),
    );
  });

  it("shows date picker when endDate is set", () => {
    render(
      <RecurrencePicker
        {...defaultProps}
        frequency="daily"
        endDate="2026-06-15"
      />,
    );
    // The DatePicker renders the formatted date as a button
    expect(screen.getByText("June 15th, 2026")).toBeInTheDocument();
  });

  it("clears endDate when 'Never' is selected", async () => {
    const onChange = vi.fn();
    const { user } = render(
      <RecurrencePicker
        {...defaultProps}
        frequency="daily"
        endDate="2026-06-15"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByLabelText("Never"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        endDate: undefined,
      }),
    );
  });
});
