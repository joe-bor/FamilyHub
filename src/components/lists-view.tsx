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
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <button
            onClick={() => setSelectedList(null)}
            className="text-sm text-primary font-medium mb-4 hover:underline"
          >
            ← Back to Lists
          </button>

          <div className="bg-card rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-card",
                  selectedListData.color,
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">
                  {selectedListData.name}
                </h2>
                <p className="text-sm text-muted-foreground">
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
                  "w-full flex items-center gap-4 p-4 rounded-xl transition-all bg-card shadow-sm",
                  item.completed && "opacity-60",
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
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
            <button className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Plus className="h-5 w-5" />
              <span className="font-medium">Add item</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-6">My Lists</h2>

        <div className="grid grid-cols-2 gap-4">
          {lists.map((list) => {
            const Icon = list.icon;
            const completedCount = list.items.filter((i) => i.completed).length;

            return (
              <button
                key={list.id}
                onClick={() => setSelectedList(list.id)}
                className="bg-card rounded-2xl p-5 shadow-sm hover:shadow-md transition-all text-left"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-card mb-3",
                    list.color,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground">{list.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {completedCount}/{list.items.length} items
                </p>
              </button>
            );
          })}

          {/* Add new list */}
          <button className="bg-card rounded-2xl p-5 shadow-sm border-2 border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-current mb-3">
              <Plus className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">New List</h3>
            <p className="text-sm mt-1">Create a list</p>
          </button>
        </div>
      </div>
    </div>
  );
}
