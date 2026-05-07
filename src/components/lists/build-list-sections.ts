import type { ListDetail, ListItem } from "@/lib/types";

export interface BuiltListSection {
  id: string;
  title: string | null;
  items: ListItem[];
}

function sortVisibleItems(items: ListItem[]): ListItem[] {
  return [...items].sort((left, right) => {
    if (left.completed !== right.completed) {
      return Number(left.completed) - Number(right.completed);
    }
    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function buildListSections({
  list,
  showCompleted,
}: {
  list: ListDetail;
  showCompleted: boolean;
}): BuiltListSection[] {
  const visibleItems = showCompleted
    ? list.items
    : list.items.filter((item) => !item.completed);

  if (list.kind === "general" || list.categoryDisplayMode === "flat") {
    return [{ id: "all", title: null, items: sortVisibleItems(visibleItems) }];
  }

  const categorizedSections = list.categories
    .map((category) => ({
      id: category.id,
      title: category.name,
      items: sortVisibleItems(
        visibleItems.filter((item) => item.categoryId === category.id),
      ),
    }))
    .filter((section) => section.items.length > 0);

  const uncategorizedItems = sortVisibleItems(
    visibleItems.filter((item) => item.categoryId === null),
  );

  return [
    ...categorizedSections,
    ...(uncategorizedItems.length > 0
      ? [
          {
            id: "uncategorized",
            title: "Uncategorized",
            items: uncategorizedItems,
          },
        ]
      : []),
  ];
}
