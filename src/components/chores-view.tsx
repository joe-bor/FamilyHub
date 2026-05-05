import { AlertCircle, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useChores,
  useCreateChore,
  useDeleteChore,
  useFamilyMembers,
  useUpdateChore,
} from "@/api";
import { ChoreFormSheet } from "@/components/chores/chore-form-sheet";
import { ChoreLane } from "@/components/chores/chore-lane";
import { Button } from "@/components/ui/button";
import { formatLocalDate } from "@/lib/time-utils";
import type { Chore, FamilyMember } from "@/lib/types";

interface ChoreLaneData {
  member: FamilyMember;
  chores: Chore[];
  hasIncomplete: boolean;
  hasAny: boolean;
}

interface ChoreLaneResult {
  mode: "active" | "all-caught-up" | "empty";
  lanes: ChoreLaneData[];
}

export function ChoresView() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const members = useFamilyMembers();
  const { data, isError, isLoading } = useChores();
  const createChore = useCreateChore({
    onSuccess: () => setCreateOpen(false),
  });
  const updateChore = useUpdateChore();
  const deleteChore = useDeleteChore();

  const chores = useMemo(() => data?.data ?? [], [data]);
  const today = formatLocalDate(new Date());
  const board = useMemo(
    () => buildChoreLanes({ chores, members, today }),
    [chores, members, today],
  );
  const defaultAssigneeId = members[0]?.id;

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-[24px] leading-8 font-semibold text-foreground">
              Chores
            </h1>
            <Button
              type="button"
              aria-label="Add chore"
              size="icon"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {isLoading && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Loading chores...
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              Could not load chores. Try again in a moment.
            </div>
          )}

          {!isLoading && !isError && board.mode === "empty" && (
            <div className="py-20 text-center">
              <h2 className="text-lg font-semibold text-foreground">
                No chores yet
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                Add the first chore to start the family board.
              </p>
              <Button
                type="button"
                className="mt-5"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add chore
              </Button>
            </div>
          )}

          {!isLoading && !isError && board.mode === "all-caught-up" && (
            <div className="mb-4 rounded-lg border border-border bg-card p-4 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">
                All caught up
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Everything is done for now. Completed chores stay visible below.
              </p>
            </div>
          )}

          {!isLoading && !isError && board.lanes.length > 0 && (
            <div className="space-y-4">
              {board.lanes.map((lane) => (
                <ChoreLane
                  key={lane.member.id}
                  member={lane.member}
                  chores={lane.chores}
                  today={today}
                  onToggleComplete={(chore) =>
                    updateChore.mutate({
                      id: chore.id,
                      request: { completed: !chore.completed },
                    })
                  }
                  onDelete={(chore) => deleteChore.mutate(chore.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ChoreFormSheet
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        isPending={createChore.isPending}
        defaultValues={
          defaultAssigneeId
            ? { assignedToMemberId: defaultAssigneeId }
            : undefined
        }
        onSubmit={(values) =>
          createChore.mutate({
            title: values.title,
            assignedToMemberId: values.assignedToMemberId,
            dueDate: values.dueDate ?? null,
          })
        }
      />
    </>
  );
}

export function buildChoreLanes({
  chores,
  members,
  today,
}: {
  chores: Chore[];
  members: FamilyMember[];
  today: string;
}): ChoreLaneResult {
  const lanes = members.map((member) => {
    const memberChores = chores.filter(
      (chore) => chore.assignedToMemberId === member.id,
    );
    const incomplete = memberChores
      .filter((chore) => !chore.completed)
      .sort((a, b) => compareChoreUrgency(a, b, today));
    const completed = memberChores.filter((chore) => chore.completed);

    return {
      member,
      chores: [...incomplete, ...completed],
      hasIncomplete: incomplete.length > 0,
      hasAny: memberChores.length > 0,
    };
  });

  const activeLanes = lanes.filter((lane) => lane.hasIncomplete);
  if (activeLanes.length > 0) {
    return { mode: "active", lanes: activeLanes };
  }

  const completedOnlyLanes = lanes.filter((lane) => lane.hasAny);
  if (completedOnlyLanes.length > 0) {
    return { mode: "all-caught-up", lanes: completedOnlyLanes };
  }

  return { mode: "empty", lanes: [] };
}

function compareChoreUrgency(a: Chore, b: Chore, today: string): number {
  const rank = (chore: Chore) => {
    if (!chore.dueDate) return 3;
    if (chore.dueDate < today) return 0;
    if (chore.dueDate === today) return 1;
    return 2;
  };

  const rankDifference = rank(a) - rank(b);
  if (rankDifference !== 0) return rankDifference;

  if (a.dueDate && b.dueDate) {
    return a.dueDate.localeCompare(b.dueDate);
  }

  return a.createdAt.localeCompare(b.createdAt);
}
