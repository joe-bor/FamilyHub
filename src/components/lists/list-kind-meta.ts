import { ClipboardList, ListTodo, ShoppingCart } from "lucide-react";
import type { ListKind } from "@/lib/types";

// Icon + label + badge styling per list kind. Shared by list cards and rail rows.
export const kindMeta: Record<
  ListKind,
  {
    label: string;
    icon: typeof ShoppingCart;
    className: string;
  }
> = {
  grocery: {
    label: "Grocery",
    icon: ShoppingCart,
    className: "bg-emerald-100 text-emerald-700",
  },
  "to-do": {
    label: "To-do",
    icon: ListTodo,
    className: "bg-sky-100 text-sky-700",
  },
  general: {
    label: "General",
    icon: ClipboardList,
    className: "bg-amber-100 text-amber-700",
  },
};
