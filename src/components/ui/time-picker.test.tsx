import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent, within } from "@/test/test-utils";
import { TimePicker } from "./time-picker";

function getMinuteWheel() {
  const wheelColumns = document.body.querySelectorAll(".scrollbar-hide");
  const minuteWheel = wheelColumns[1];

  if (!minuteWheel) {
    throw new Error("Minute wheel was not rendered");
  }

  return minuteWheel as HTMLElement;
}

function getUniqueMinuteLabels() {
  const minuteButtons = within(getMinuteWheel()).getAllByRole("button");
  return Array.from(
    new Set(minuteButtons.map((button) => button.textContent ?? "")),
  ).sort((a, b) => Number(a) - Number(b));
}

describe("TimePicker", () => {
  beforeEach(() => {
    class ResizeObserverMock {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  it("renders 12 five-minute choices for an on-grid value", async () => {
    const user = userEvent.setup();

    render(<TimePicker value="09:00" onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /9:00 AM/i }));

    expect(getUniqueMinuteLabels()).toEqual([
      "00",
      "05",
      "10",
      "15",
      "20",
      "25",
      "30",
      "35",
      "40",
      "45",
      "50",
      "55",
    ]);
  });

  it("shows an off-grid minute as the only extra choice and confirms it unchanged", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TimePicker value="09:47" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /9:47 AM/i }));

    expect(getUniqueMinuteLabels()).toEqual([
      "00",
      "05",
      "10",
      "15",
      "20",
      "25",
      "30",
      "35",
      "40",
      "45",
      "47",
      "50",
      "55",
    ]);

    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(onChange).toHaveBeenCalledWith("09:47");
  });
});
