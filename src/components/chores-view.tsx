import { Check, RotateCcw, Star, Trophy } from "lucide-react";
import { useState } from "react";
import { generateSampleChores } from "@/lib/calendar-data";
import {
  type ChoreItem,
  colorMap,
  familyMembers,
  getFamilyMember,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function ChoresView() {
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

  const getMember = (id: string) => getFamilyMember(id);

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Today's Chores</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">
              {chores.filter((c) => c.completed).length} of {chores.length}{" "}
              total completed
            </span>
          </div>
        </div>

        {/* Family member containers grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden"
              >
                {/* Member header with colored bar */}
                <div className={cn("px-5 py-4", colors?.bg)}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg">
                        {member.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-3.5 w-3.5 text-white/80 fill-white/80" />
                        <span className="text-white/90 text-sm">
                          {completedCount}/{totalCount} done
                        </span>
                      </div>
                    </div>
                    {progressPercent === 100 && (
                      <div className="bg-white/20 rounded-full p-2">
                        <Trophy className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Chores list */}
                <div className="p-4 space-y-2">
                  {memberChores.map((chore) => (
                    <button
                      key={chore.id}
                      onClick={() => toggleChore(chore.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                        chore.completed
                          ? "bg-green-50 border border-green-200"
                          : "bg-muted/50 border border-transparent hover:border-border",
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
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
                            "font-medium text-sm truncate",
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
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No chores today!
            </h3>
            <p className="text-muted-foreground">Enjoy your free time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
