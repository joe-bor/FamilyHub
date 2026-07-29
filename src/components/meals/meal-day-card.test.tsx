import { formatLocalDate } from "@/lib/time-utils";
import { render, screen } from "@/test/test-utils";
import { MealDayCard } from "./meal-day-card";

const dayWith = (date: string, dayIndex = 0) => ({ date, dayIndex, slots: [] });

describe("MealDayCard today affordance", () => {
  it("marks today with aria-current", () => {
    render(
      <MealDayCard
        day={dayWith(formatLocalDate(new Date()))}
        readOnly={false}
        onSelectSlot={() => {}}
      />,
    );
    expect(screen.getByRole("region")).toHaveAttribute("aria-current", "date");
  });

  it("does not mark a non-today day", () => {
    render(
      <MealDayCard
        day={dayWith("2020-01-02")}
        readOnly={false}
        onSelectSlot={() => {}}
      />,
    );
    expect(screen.getByRole("region")).not.toHaveAttribute("aria-current");
  });
});
