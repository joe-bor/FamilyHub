import { create } from "zustand"
import type { MealPlan } from "@/lib/types"
import { generateSampleMeals } from "@/lib/calendar-data"

interface MealsState {
  meals: MealPlan[]
  updateMeal: (id: string, updates: Partial<MealPlan>) => void
  addMeal: (meal: Omit<MealPlan, "id">) => void
  deleteMeal: (id: string) => void
}

export const useMealsStore = create<MealsState>((set) => ({
  meals: generateSampleMeals(),

  updateMeal: (id, updates) =>
    set((state) => ({
      meals: state.meals.map((meal) =>
        meal.id === id ? { ...meal, ...updates } : meal
      ),
    })),

  addMeal: (mealData) =>
    set((state) => ({
      meals: [...state.meals, { ...mealData, id: `meal-${Date.now()}` }],
    })),

  deleteMeal: (id) =>
    set((state) => ({
      meals: state.meals.filter((meal) => meal.id !== id),
    })),
}))
