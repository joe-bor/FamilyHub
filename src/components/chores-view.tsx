import { Check, RotateCcw, Star, Trophy } from "lucide-react";
import { useState } from "react";
import { useFamilyMembers } from "@/api";
import { generateSampleChores } from "@/lib/calendar-data";
import { type ChoreItem, colorMap, getFamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ChoresView() {
  const familyMembers = useFamilyMembers();
  const [chores, setChores] = useState<ChoreItem[]>(generateSampleChores());

  const toggleChore = (id: string) => {
    setChores((prev) =>
      prev.map((chore) =>
        chore.id === id ? { ...chore, completed: !chore.completed } : chore,
      ),
    );
  };

  // Group chores by family member
  const choresByMember = familyMembers.reduce(
    (acc, member) => {
      const memberChores = chores.filter(
        (chore) => chore.assignedTo === member.id,
      );
      if (memberChores.length > 0) {
        acc[member.id] = memberChores;
      }
      return acc;
    },
    {} as Record<string, ChoreItem[]>,
  );

  const getMember = (id: string) => getFamilyMember(familyMembers, id);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[24px] leading-8 font-semibold text-foreground">
            Today's Chores
          </h1>
          <div className="flex items-center gap-2 text-sm leading-5 text-muted-foreground">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">
              {chores.filter((c) => c.completed).length} of {chores.length}{" "}
              total completed
            </span>
          </div>
        </div>

        {/* Family member containers grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(choresByMember).map(([memberId, memberChores]) => {
            const member = getMember(memberId);
            if (!member) return null;

            const colors = colorMap[member.color];
            const completedCount = memberChores.filter(
              (c) => c.completed,
            ).length;
            const totalCount = memberChores.length;
            const progressPercent =
              totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

            return (
              <div
                key={memberId}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                {/* Member header with colored bar */}
                <div className={cn("px-5 py-4", colors?.bg)}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                      <span className="text-xl font-bold text-white">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {member.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-white/80 fill-white/80" />
                        <span className="text-sm text-white/90">
                          {completedCount}/{totalCount} done
                        </span>
                      </div>
                    </div>
                    {progressPercent === 100 && (
                      <div className="rounded-full bg-white/20 p-2">
                        <Trophy className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Chores list */}
                <div className="space-y-2 p-4">
                  {memberChores.map((chore) => (
                    <button
                      key={chore.id}
                      onClick={() => toggleChore(chore.id)}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 rounded-xl p-3 text-left transition-all",
                        chore.completed
                          ? "bg-green-50 border border-green-200"
                          : "bg-muted/50 border border-transparent hover:border-border",
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                          chore.completed
                            ? "bg-green-500"
                            : "border-2 border-border bg-white",
                        )}
                      >
                        {chore.completed && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </div>

                      {/* Chore info */}
                      <div className="flex-1 min-w-0">
                        <h4
                          className={cn(
                            "truncate text-sm font-semibold",
                            chore.completed
                              ? "text-muted-foreground line-through"
                              : "text-foreground",
                          )}
                        >
                          {chore.title}
                        </h4>
                        {chore.recurring && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <RotateCcw className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground capitalize">
                              {chore.recurring}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}

                  {memberChores.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No chores assigned
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state if no chores */}
        {Object.keys(choresByMember).length === 0 && (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              No chores today!
            </h3>
            <p className="text-base leading-6 text-muted-foreground">
              Enjoy your free time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
