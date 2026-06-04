import {
  BookOpenText,
  Calendar,
  CheckSquare,
  Home,
  ImageIcon,
  ListTodo,
  type LucideIcon,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ModuleType, useAppStore } from "@/stores";

const tabs: Array<{ id: ModuleType | null; label: string; icon: LucideIcon }> =
  [
    { id: null, label: "Home", icon: Home },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "lists", label: "Lists", icon: ListTodo },
    { id: "chores", label: "Chores", icon: CheckSquare },
    { id: "meals", label: "Meals", icon: UtensilsCrossed },
    { id: "recipes", label: "Recipes", icon: BookOpenText },
    { id: "photos", label: "Photos", icon: ImageIcon },
  ];

export function MobileBottomNav() {
  const activeModule = useAppStore((state) => state.activeModule);
  const setActiveModule = useAppStore((state) => state.setActiveModule);

  return (
    <nav
      aria-label="Primary"
      className="z-30 shrink-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85"
    >
      <div
        className="grid grid-cols-7 gap-0.5 px-1 pt-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeModule === tab.id;

          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActiveModule(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-2 text-[10px] leading-none font-semibold transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-full truncate leading-3">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
