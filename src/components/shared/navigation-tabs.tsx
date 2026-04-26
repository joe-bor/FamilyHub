import {
  Calendar,
  CheckSquare,
  ImageIcon,
  ListTodo,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ModuleType, useAppStore } from "@/stores";

// Keep TabType export for backward compatibility
export type TabType = ModuleType;

const tabs = [
  { id: "calendar" as ModuleType, label: "Calendar", icon: Calendar },
  { id: "lists" as ModuleType, label: "Lists", icon: ListTodo },
  { id: "chores" as ModuleType, label: "Chores", icon: CheckSquare },
  { id: "meals" as ModuleType, label: "Meals", icon: UtensilsCrossed },
  { id: "photos" as ModuleType, label: "Photos", icon: ImageIcon },
];

export function NavigationTabs() {
  const activeModule = useAppStore((state) => state.activeModule);
  const setActiveModule = useAppStore((state) => state.setActiveModule);

  return (
    <>
      <nav className="hidden sm:flex w-20 flex-col items-center gap-2 py-6 bg-card border-r border-border shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeModule === tab.id;

          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveModule(tab.id)}
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

      <nav className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeModule === tab.id;

            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveModule(tab.id)}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
