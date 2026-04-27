import {
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
    { id: "photos", label: "Photos", icon: ImageIcon },
  ];

export function MobileBottomNav() {
  const activeModule = useAppStore((state) => state.activeModule);
  const setActiveModule = useAppStore((state) => state.setActiveModule);

  return (
    <nav
      aria-label="Primary"
      className="sm:hidden shrink-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 z-30"
    >
      <div
        className="grid grid-cols-6 gap-1 px-2 pt-2"
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
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
