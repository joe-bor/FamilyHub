import type { RecipeDetail, RecipeSummary } from "@/lib/types";

export const testRecipeDetail: RecipeDetail = {
  id: "00000000-0000-4000-8000-000000000501",
  title: "Sheet Pan Salmon",
  imageUrl: "https://example.com/salmon.jpg",
  ingredients: ["Salmon fillets", "Asparagus", "Lemon"],
  instructions: ["Heat oven to 425F", "Roast everything together"],
  note: "Weeknight favorite",
  sourceUrl: "https://example.com/sheet-pan-salmon",
  tags: ["dinner", "quick"],
  favorite: true,
  updatedAt: "2026-06-04T09:00:00",
};

export const testRecipeSummary: RecipeSummary = {
  id: testRecipeDetail.id,
  title: testRecipeDetail.title,
  imageUrl: testRecipeDetail.imageUrl,
  favorite: testRecipeDetail.favorite,
  tags: testRecipeDetail.tags,
  updatedAt: testRecipeDetail.updatedAt,
};

export const importedRecipeDetail: RecipeDetail = {
  id: "00000000-0000-4000-8000-000000000502",
  title: "Imported Tomato Soup",
  imageUrl: null,
  ingredients: ["Tomatoes", "Stock", "Cream"],
  instructions: ["Simmer tomatoes and stock", "Blend with cream"],
  note: null,
  sourceUrl: "https://example.com/imported-tomato-soup",
  tags: ["lunch"],
  favorite: false,
  updatedAt: "2026-06-04T09:00:00",
};
