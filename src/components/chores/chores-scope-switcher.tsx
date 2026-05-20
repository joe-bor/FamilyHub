import { cn } from "@/lib/utils";

export type ChoreScopeKey = "today" | "thisWeek" | "thisMonth";

interface ChoreScopeSwitcherProps {
  value: ChoreScopeKey;
  onChange: (value: ChoreScopeKey) => void;
}

const scopeOptions = [
  { key: "today", label: "Day" },
  { key: "thisWeek", label: "Week" },
  { key: "thisMonth", label: "Month" },
] as const;

export function ChoreScopeSwitcher({
  value,
  onChange,
}: ChoreScopeSwitcherProps) {
  return (
    <div
      className="inline-flex rounded-lg bg-muted p-1"
      role="tablist"
      aria-label="Chore scope"
    >
      {scopeOptions.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            "min-h-10 rounded-md px-3 text-sm font-semibold transition-colors",
            value === option.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
