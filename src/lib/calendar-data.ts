// Generator functions for sample data
// Types and data are in @/lib/types

import type { CalendarEvent, ChoreItem, MealPlan } from "./types"

export function generateSampleEvents(): CalendarEvent[] {
  const today = new Date()
  const events: CalendarEvent[] = []

  const eventTemplates = [
    {
      title: "Coffee with Diana",
      memberId: "1",
      startTime: "9:00 AM",
      endTime: "10:00 AM",
    },
    {
      title: "Pickup Day Cleaning",
      memberId: "6",
      startTime: "8:00 AM",
      endTime: "9:00 AM",
    },
    {
      title: "Soccer Practice",
      memberId: "4",
      startTime: "4:00 PM",
      endTime: "5:30 PM",
    },
    {
      title: "Emma's Birthday Party",
      memberId: "3",
      startTime: "2:00 PM",
      endTime: "5:00 PM",
    },
    {
      title: "Grocery Run",
      memberId: "1",
      startTime: "11:00 AM",
      endTime: "12:00 PM",
    },
    {
      title: "Dogo's Bath Day!",
      memberId: "6",
      startTime: "10:00 AM",
      endTime: "11:00 AM",
    },
    {
      title: "Amelia's Baby Shower",
      memberId: "1",
      startTime: "1:00 PM",
      endTime: "3:00 PM",
    },
    {
      title: "Tutoring",
      memberId: "3",
      startTime: "3:30 PM",
      endTime: "4:30 PM",
    },
    {
      title: "Mincey Toss",
      memberId: "4",
      startTime: "9:00 AM",
      endTime: "10:00 AM",
    },
    {
      title: "House Cleaner Estimate",
      memberId: "2",
      startTime: "10:00 AM",
      endTime: "11:00 AM",
    },
    {
      title: "Dance Group",
      memberId: "5",
      startTime: "5:00 PM",
      endTime: "6:30 PM",
    },
    {
      title: "Lunch With Mom",
      memberId: "1",
      startTime: "12:00 PM",
      endTime: "1:30 PM",
    },
    {
      title: "Harvest Festival",
      memberId: "6",
      startTime: "10:00 AM",
      endTime: "2:00 PM",
    },
    {
      title: "Pop Rally",
      memberId: "3",
      startTime: "2:00 PM",
      endTime: "3:00 PM",
    },
    {
      title: "Volleyball Practice",
      memberId: "3",
      startTime: "4:00 PM",
      endTime: "5:30 PM",
    },
    {
      title: "Math Tutoring",
      memberId: "4",
      startTime: "3:00 PM",
      endTime: "4:00 PM",
    },
    {
      title: "Luna Vet Checkup",
      memberId: "1",
      startTime: "2:00 PM",
      endTime: "3:00 PM",
    },
    {
      title: "Volleyball Game",
      memberId: "3",
      startTime: "6:00 PM",
      endTime: "8:00 PM",
    },
    {
      title: "Reading Time",
      memberId: "5",
      startTime: "7:00 PM",
      endTime: "8:00 PM",
    },
  ]

  // Distribute events across the week
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - today.getDay() + i + 3) // Start from Wednesday

    // Add 2-4 random events per day
    const numEvents = Math.floor(Math.random() * 3) + 2
    const shuffled = [...eventTemplates].sort(() => Math.random() - 0.5)

    for (let j = 0; j < numEvents && j < shuffled.length; j++) {
      const template = shuffled[j]
      events.push({
        id: `event-${i}-${j}`,
        title: template.title,
        startTime: template.startTime,
        endTime: template.endTime,
        date: new Date(date),
        memberId: template.memberId,
      })
    }
  }

  return events
}

export function generateSampleChores(): ChoreItem[] {
  const today = new Date()
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
  ]
}

export function generateSampleMeals(): MealPlan[] {
  const today = new Date()
  const meals: MealPlan[] = []

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
  }

  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - today.getDay() + i + 3)

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
    })
  }

  return meals
}
