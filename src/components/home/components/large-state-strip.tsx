import { CheckSquare, ListTodo, UtensilsCrossed } from "lucide-react";
import type {
  HomeStateSummary,
  HomeSummaryTarget,
} from "../lib/large-home-selectors";

const iconByModule = {
  chores: CheckSquare,
  meals: UtensilsCrossed,
  lists: ListTodo,
};

const labelByModule = {
  chores: "Chores",
  meals: "Meals",
  lists: "Lists",
};

export function LargeStateStrip({
  summaries,
  onSelect,
}: {
  summaries: HomeStateSummary[];
  onSelect: (target: HomeSummaryTarget) => void;
}) {
  return (
    <section aria-label="Household status" className="grid grid-cols-3 gap-3">
      {summaries.map((summary) => {
        const Icon = iconByModule[summary.module];
        const moduleLabel = labelByModule[summary.module];
        return (
          <button
            key={summary.module}
            type="button"
            onClick={() => onSelect(summary.target)}
            aria-label={`Open ${moduleLabel}. ${summary.label}`}
            className="min-h-24 rounded-lg border border-border/70 bg-card px-4 py-4 text-left shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span>{moduleLabel}</span>
            </div>
            <p className="text-xl font-semibold leading-7 text-foreground">
              {summary.label}
            </p>
          </button>
        );
      })}
    </section>
  );
}
