import {
  BookOpenText,
  Calendar,
  CheckSquare,
  Home,
  ImageIcon,
  ListTodo,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ModuleType, useAppStore } from "@/stores";

// Keep TabType export for backward compatibility
export type TabType = ModuleType;

type DesktopNavItem = {
  id: ModuleType | null;
  label: string;
  icon: typeof Home;
};

const tabs: DesktopNavItem[] = [
  { id: null, label: "Home", icon: Home },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "lists", label: "Lists", icon: ListTodo },
  { id: "chores", label: "Chores", icon: CheckSquare },
  { id: "meals", label: "Meals", icon: UtensilsCrossed },
  { id: "recipes", label: "Recipes", icon: BookOpenText },
  { id: "photos", label: "Photos", icon: ImageIcon },
];

export function NavigationTabs() {
  const activeModule = useAppStore((state) => state.activeModule);
  const setActiveModule = useAppStore((state) => state.setActiveModule);

  return (
    <nav className="flex w-20 flex-col items-center gap-2 py-6 bg-card border-r border-border shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeModule === tab.id;

        return (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveModule(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-3 rounded-xl w-16 transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
