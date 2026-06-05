/**
 * Normalize a recipe tag for consistent display and comparison.
 *
 * Tags are intentionally lightweight, so we trim whitespace and lowercase them
 * everywhere they surface — library cards, recipe detail, and filter chips — to
 * avoid the same tag rendering differently in different places.
 */
export function formatRecipeTag(tag: string): string {
  return tag.trim().toLowerCase();
}
