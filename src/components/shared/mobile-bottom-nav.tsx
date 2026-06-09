import {
  BookOpenText,
  Calendar,
  CheckSquare,
  Home,
  ListTodo,
  type LucideIcon,
  MoreHorizontal,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { cn } from "@/lib/utils";
import { type ModuleType, useAppStore } from "@/stores";

type NavModule = { id: ModuleType | null; label: string; icon: LucideIcon };

// Ordered navigable modules. First PRIMARY_COUNT render in the bar; the rest
// overflow into the "More" sheet. Photos is intentionally omitted (deferred).
// Appending a future module here makes it overflow automatically.
const MODULES: NavModule[] = [
  { id: null, label: "Home", icon: Home },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "lists", label: "Lists", icon: ListTodo },
  { id: "chores", label: "Chores", icon: CheckSquare },
  { id: "meals", label: "Meals", icon: UtensilsCrossed },
  { id: "recipes", label: "Recipes", icon: BookOpenText },
];
const PRIMARY_COUNT = 4;
const primaryModules = MODULES.slice(0, PRIMARY_COUNT);
const overflowModules = MODULES.slice(PRIMARY_COUNT);

const tabBase =
  "flex min-h-14 min-w-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-[11px] leading-none font-semibold transition-colors";
const tabActive =
  "bg-primary text-primary-foreground shadow-sm shadow-primary/20";
const tabIdle = "text-muted-foreground hover:bg-muted hover:text-foreground";

export function MobileBottomNav() {
  const activeModule = useAppStore((state) => state.activeModule);
  const setActiveModule = useAppStore((state) => state.setActiveModule);
  const [moreOpen, setMoreOpen] = useState(false);

  const overflowActive = overflowModules.some((m) => m.id === activeModule);

  const selectOverflow = (id: ModuleType | null) => {
    setActiveModule(id);
    setMoreOpen(false);
  };

  return (
    <>
      <nav
        aria-label="Primary"
        className="z-30 shrink-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85"
      >
        <div
          className="flex gap-1 px-2 pt-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          {primaryModules.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeModule === tab.id;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setActiveModule(tab.id)}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(tabBase, isActive ? tabActive : tabIdle)}
              >
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap leading-3">{tab.label}</span>
              </button>
            );
          })}

          {overflowModules.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More"
              aria-current={overflowActive ? "page" : undefined}
              className={cn(tabBase, overflowActive ? tabActive : tabIdle)}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="whitespace-nowrap leading-3">More</span>
            </button>
          )}
        </div>
      </nav>

      <MobileSheet
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="More"
      >
        <div className="space-y-1">
          {overflowModules.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeModule === tab.id;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => selectOverflow(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </MobileSheet>
    </>
  );
}
