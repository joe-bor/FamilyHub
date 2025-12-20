// Generator functions for sample data
// Types and data are in @/lib/types
// Note: Calendar events now use mock API handlers in @/api/mocks/calendar.mock.ts

import type { ChoreItem, MealPlan } from "./types";

export function generateSampleChores(): ChoreItem[] {
  const today = new Date();
  return [
    {
      id: "1",
      title: "Make bed",
      assignedTo: "3",
      completed: true,
      dueDate: today,
      recurring: "daily",
    },
    {
      id: "2",
      title: "Feed the dog",
      assignedTo: "4",
      completed: false,
      dueDate: today,
      recurring: "daily",
    },
    {
      id: "3",
      title: "Take out trash",
      assignedTo: "4",
      completed: false,
      dueDate: today,
      recurring: "weekly",
    },
    {
      id: "4",
      title: "Clean room",
      assignedTo: "3",
      completed: false,
      dueDate: today,
      recurring: "weekly",
    },
    {
      id: "5",
      title: "Do homework",
      assignedTo: "3",
      completed: true,
      dueDate: today,
      recurring: "daily",
    },
    {
      id: "6",
      title: "Practice piano",
      assignedTo: "5",
      completed: false,
      dueDate: today,
      recurring: "daily",
    },
    {
      id: "7",
      title: "Water plants",
      assignedTo: "5",
      completed: true,
      dueDate: today,
      recurring: "weekly",
    },
    {
      id: "8",
      title: "Set table",
      assignedTo: "4",
      completed: false,
      dueDate: today,
      recurring: "daily",
    },
  ];
}

export function generateSampleMeals(): MealPlan[] {
  const today = new Date();
  const meals: MealPlan[] = [];

  const mealOptions = {
    breakfast: [
      "Pancakes",
      "Oatmeal",
      "Eggs & Toast",
      "Smoothie Bowl",
      "Cereal",
      "Waffles",
      "Yogurt Parfait",
    ],
    lunch: [
      "Sandwiches",
      "Salad",
      "Soup",
      "Leftovers",
      "Pizza",
      "Tacos",
      "Pasta Salad",
    ],
    dinner: [
      "Grilled Chicken",
      "Pasta Night",
      "Taco Tuesday",
      "Fish & Veggies",
      "Stir Fry",
      "BBQ Ribs",
      "Homemade Pizza",
    ],
  };

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - today.getDay() + i + 3);

    meals.push({
      id: `meal-${i}`,
      date: new Date(date),
      breakfast:
        mealOptions.breakfast[
          Math.floor(Math.random() * mealOptions.breakfast.length)
        ],
      lunch:
        mealOptions.lunch[Math.floor(Math.random() * mealOptions.lunch.length)],
      dinner:
        mealOptions.dinner[
          Math.floor(Math.random() * mealOptions.dinner.length)
        ],
    });
  }

  return meals;
}
