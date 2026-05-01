import { ChevronLeft, ChevronRight, Coffee, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateSampleMeals } from "@/lib/calendar-data";
import type { MealPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MealsView() {
  const [meals] = useState<MealPlan[]>(generateSampleMeals());
  const [selectedDay, setSelectedDay] = useState(0);

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const formatDayNumber = (date: Date) => {
    return date.getDate();
  };

  const today = new Date();

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Week selector */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-[24px] leading-8 font-semibold text-foreground">
            Meal Planning
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm leading-5 font-medium text-muted-foreground">
              This Week
            </span>
            <Button variant="ghost" size="icon-sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {meals.map((meal, index) => (
            <button
              key={meal.id}
              onClick={() => setSelectedDay(index)}
              className={cn(
                "flex min-w-[68px] flex-col items-center rounded-xl px-4 py-3 transition-all",
                selectedDay === index
                  ? "bg-primary text-primary-foreground"
                  : isToday(meal.date)
                    ? "bg-primary/10 text-primary"
                    : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              <span className="text-xs font-semibold">
                {formatDayName(meal.date)}
              </span>
              <span className="mt-1 text-lg font-semibold">
                {formatDayNumber(meal.date)}
              </span>
            </button>
          ))}
        </div>

        {/* Meals for selected day */}
        <div className="space-y-4">
          {/* Breakfast */}
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <Coffee className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-base leading-6 font-semibold text-foreground">
                  Breakfast
                </h3>
                <p className="text-xs text-muted-foreground">Morning meal</p>
              </div>
            </div>
            <div className="rounded-xl bg-yellow-50 p-4">
              <p className="text-[15px] leading-5 font-medium text-foreground">
                {meals[selectedDay]?.breakfast || "No meal planned"}
              </p>
            </div>
          </div>

          {/* Lunch */}
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <Sun className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-base leading-6 font-semibold text-foreground">
                  Lunch
                </h3>
                <p className="text-xs text-muted-foreground">Midday meal</p>
              </div>
            </div>
            <div className="rounded-xl bg-orange-50 p-4">
              <p className="text-[15px] leading-5 font-medium text-foreground">
                {meals[selectedDay]?.lunch || "No meal planned"}
              </p>
            </div>
          </div>

          {/* Dinner */}
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                <Moon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base leading-6 font-semibold text-foreground">
                  Dinner
                </h3>
                <p className="text-xs text-muted-foreground">Evening meal</p>
              </div>
            </div>
            <div className="rounded-xl bg-indigo-50 p-4">
              <p className="text-[15px] leading-5 font-medium text-foreground">
                {meals[selectedDay]?.dinner || "No meal planned"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
