import type { Chore, FamilyMember } from "@/lib/types";
import { colorMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChoreRow } from "./chore-row";

interface ChoreLaneProps {
  member: FamilyMember;
  chores: Chore[];
  today: string;
  onToggleComplete: (chore: Chore) => void;
  onDelete: (chore: Chore) => void;
}

export function ChoreLane({
  member,
  chores,
  today,
  onToggleComplete,
  onDelete,
}: ChoreLaneProps) {
  const colors = colorMap[member.color];
  const completedCount = chores.filter((chore) => chore.completed).length;
  const progressPercent =
    chores.length === 0
      ? 0
      : Math.round((completedCount / chores.length) * 100);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <header className={cn("px-5 py-4", colors.light)}>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white",
              colors.bg,
            )}
          >
            {member.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-foreground">
              {member.name}
            </h2>
          </div>
        </div>
        <div
          role="progressbar"
          aria-label={`${member.name} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
          className="mt-3 h-2 overflow-hidden rounded-full bg-white/70"
        >
          <div
            className={cn("h-full rounded-full transition-all", colors.bg)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      <div className="space-y-2 p-4">
        {chores.map((chore) => (
          <ChoreRow
            key={chore.id}
            chore={chore}
            today={today}
            onToggleComplete={() => onToggleComplete(chore)}
            onDelete={() => onDelete(chore)}
          />
        ))}
      </div>
    </section>
  );
}

export type { ChoreLaneProps };
