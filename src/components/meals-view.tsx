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
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        {/* Week selector */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Meal Planning</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              This Week
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {meals.map((meal, index) => (
            <button
              key={meal.id}
              onClick={() => setSelectedDay(index)}
              className={cn(
                "flex flex-col items-center px-4 py-3 rounded-xl min-w-[70px] transition-all",
                selectedDay === index
                  ? "bg-primary text-primary-foreground"
                  : isToday(meal.date)
                    ? "bg-primary/10 text-primary"
                    : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              <span className="text-xs font-medium">
                {formatDayName(meal.date)}
              </span>
              <span className="text-lg font-bold mt-1">
                {formatDayNumber(meal.date)}
              </span>
            </button>
          ))}
        </div>

        {/* Meals for selected day */}
        <div className="space-y-4">
          {/* Breakfast */}
          <div className="bg-card rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Coffee className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Breakfast</h3>
                <p className="text-xs text-muted-foreground">Morning meal</p>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4">
              <p className="font-medium text-foreground">
                {meals[selectedDay]?.breakfast || "No meal planned"}
              </p>
            </div>
          </div>

          {/* Lunch */}
          <div className="bg-card rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Sun className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Lunch</h3>
                <p className="text-xs text-muted-foreground">Midday meal</p>
              </div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4">
              <p className="font-medium text-foreground">
                {meals[selectedDay]?.lunch || "No meal planned"}
              </p>
            </div>
          </div>

          {/* Dinner */}
          <div className="bg-card rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Moon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Dinner</h3>
                <p className="text-xs text-muted-foreground">Evening meal</p>
              </div>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="font-medium text-foreground">
                {meals[selectedDay]?.dinner || "No meal planned"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
