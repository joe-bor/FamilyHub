import { Check } from "lucide-react";
import { useEffect } from "react";
import { useFamilyMembers } from "@/api";
import { colorMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useFilterPillsState } from "@/stores";

export function FamilyFilterPills() {
  const familyMembers = useFamilyMembers();

  // Compound selector with shallow comparison (4 separate calls → 1)
  const {
    filter,
    toggleMember,
    toggleAllMembers,
    toggleAllDayEvents,
    initializeSelectedMembers,
  } = useFilterPillsState();

  // Initialize selected members on first load or when persisted filter is stale
  useEffect(() => {
    if (familyMembers.length === 0) return;

    const currentMemberIds = familyMembers.map((m) => m.id);

    // Check if any selected member still exists in the actual family
    const hasValidSelection = filter.selectedMembers.some((id) =>
      currentMemberIds.includes(id),
    );

    if (filter.selectedMembers.length === 0 || !hasValidSelection) {
      // First load or all selected members are stale → select all
      initializeSelectedMembers(currentMemberIds);
    }
  }, [familyMembers, filter.selectedMembers, initializeSelectedMembers]);

  const allSelected = filter.selectedMembers.length === familyMembers.length;
  const noneSelected = filter.selectedMembers.length === 0;

  const handleToggleAll = () => {
    toggleAllMembers(familyMembers.map((m) => m.id));
  };

  return (
    <div
      className="flex items-center gap-1.5"
      data-testid="family-filter-pills"
    >
      <button
        onClick={handleToggleAll}
        className={cn(
          "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
          allSelected
            ? "bg-foreground text-background border-foreground"
            : noneSelected
              ? "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              : "bg-muted text-muted-foreground border-border hover:bg-muted/80",
        )}
      >
        {allSelected ? "All" : noneSelected ? "None" : "Some"}
      </button>

      <button
        onClick={toggleAllDayEvents}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
          filter.showAllDayEvents
            ? "bg-primary/10 text-primary border-primary/30"
            : "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
        )}
      >
        <span className="text-[10px] font-bold">24h</span>
        <span className="hidden sm:inline">All Day</span>
        {filter.showAllDayEvents && <Check className="h-3 w-3" />}
      </button>

      <div className="w-px h-5 bg-border mx-1" />

      {familyMembers.map((member) => {
        const colors = colorMap[member.color];
        const isSelected = filter.selectedMembers.includes(member.id);

        return (
          <button
            key={member.id}
            onClick={() => toggleMember(member.id)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all",
              isSelected
                ? `${colors?.bg} text-white shadow-sm`
                : "bg-muted text-muted-foreground hover:bg-muted/80 opacity-50",
            )}
            title={member.name}
            aria-label={`Filter by ${member.name}`}
          >
            <span
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                isSelected ? "bg-white/20" : colors?.bg,
                !isSelected && "text-white",
              )}
            >
              {member.name.charAt(0)}
            </span>
            <span className="hidden sm:inline">{member.name}</span>
          </button>
        );
      })}
    </div>
  );
}
