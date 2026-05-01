import {
  Check,
  ClipboardList,
  Gift,
  Plane,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ListItem {
  id: string;
  text: string;
  completed: boolean;
}

interface List {
  id: string;
  name: string;
  icon: typeof ShoppingCart;
  color: string;
  items: ListItem[];
}

const initialLists: List[] = [
  {
    id: "1",
    name: "Grocery List",
    icon: ShoppingCart,
    color: "bg-green-500",
    items: [
      { id: "1", text: "Milk", completed: false },
      { id: "2", text: "Bread", completed: true },
      { id: "3", text: "Eggs", completed: false },
      { id: "4", text: "Butter", completed: false },
      { id: "5", text: "Apples", completed: true },
    ],
  },
  {
    id: "2",
    name: "To-Do",
    icon: ClipboardList,
    color: "bg-blue-500",
    items: [
      { id: "1", text: "Call dentist", completed: false },
      { id: "2", text: "Schedule car service", completed: false },
      { id: "3", text: "Pay bills", completed: true },
    ],
  },
  {
    id: "3",
    name: "Gift Ideas",
    icon: Gift,
    color: "bg-pink-500",
    items: [
      { id: "1", text: "Book for Mom", completed: false },
      { id: "2", text: "Lego set for Jack", completed: false },
    ],
  },
  {
    id: "4",
    name: "Vacation Planning",
    icon: Plane,
    color: "bg-purple-500",
    items: [
      { id: "1", text: "Book flights", completed: true },
      { id: "2", text: "Reserve hotel", completed: true },
      { id: "3", text: "Pack bags", completed: false },
    ],
  },
];

export function ListsView() {
  const [lists, setLists] = useState<List[]>(initialLists);
  const [selectedList, setSelectedList] = useState<string | null>(null);

  const toggleItem = (listId: string, itemId: string) => {
    setLists((prev) =>
      prev.map((list) => {
        if (list.id === listId) {
          return {
            ...list,
            items: list.items.map((item) =>
              item.id === itemId
                ? { ...item, completed: !item.completed }
                : item,
            ),
          };
        }
        return list;
      }),
    );
  };

  const selectedListData = lists.find((l) => l.id === selectedList);

  if (selectedListData) {
    const Icon = selectedListData.icon;
    const completedCount = selectedListData.items.filter(
      (i) => i.completed,
    ).length;

    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <button
            onClick={() => setSelectedList(null)}
            className="mb-4 rounded-lg py-1 text-sm font-semibold text-primary hover:underline"
          >
            ← Back to Lists
          </button>

          <div className="mb-6 rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl text-card",
                  selectedListData.color,
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-[22px] leading-7 font-semibold text-foreground">
                  {selectedListData.name}
                </h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {completedCount} of {selectedListData.items.length} completed
                </p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {selectedListData.items.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem(selectedListData.id, item.id)}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-xl bg-card p-4 text-left shadow-sm transition-all",
                  item.completed && "opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                    item.completed
                      ? selectedListData.color
                      : "border-2 border-border",
                  )}
                >
                  {item.completed && <Check className="h-4 w-4 text-card" />}
                </div>
                <span
                  className={cn(
                    "font-medium",
                    item.completed
                      ? "line-through text-muted-foreground"
                      : "text-foreground",
                  )}
                >
                  {item.text}
                </span>
              </button>
            ))}

            {/* Add item button */}
            <button className="flex min-h-12 w-full items-center gap-3 rounded-xl border-2 border-dashed border-border p-4 text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <Plus className="h-5 w-5" />
              <span className="font-medium">Add item</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="mb-6 text-[24px] leading-8 font-semibold text-foreground">
          My Lists
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {lists.map((list) => {
            const Icon = list.icon;
            const completedCount = list.items.filter((i) => i.completed).length;

            return (
              <button
                key={list.id}
                onClick={() => setSelectedList(list.id)}
                className="rounded-2xl bg-card p-4 text-left shadow-sm transition-all hover:shadow-md"
              >
                <div
                  className={cn(
                    "mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-card",
                    list.color,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-[17px] leading-6 font-semibold text-foreground">
                  {list.name}
                </h3>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {completedCount}/{list.items.length} items
                </p>
              </button>
            );
          })}

          {/* Add new list */}
          <button className="rounded-2xl border-2 border-dashed border-border bg-card p-4 text-muted-foreground shadow-sm transition-colors hover:border-primary hover:text-primary">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-current">
              <Plus className="h-5 w-5" />
            </div>
            <h3 className="text-[17px] leading-6 font-semibold">New List</h3>
            <p className="mt-1 text-sm leading-5">Create a list</p>
          </button>
        </div>
      </div>
    </div>
  );
}
