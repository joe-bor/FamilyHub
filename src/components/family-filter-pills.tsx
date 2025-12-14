import { familyMembers, colorMap } from "@/lib/calendar-data"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import type { FilterState } from "./calendar-filter"

interface FamilyFilterPillsProps {
  filter: FilterState
  onFilterChange: (filter: FilterState) => void
}

export function FamilyFilterPills({ filter, onFilterChange }: FamilyFilterPillsProps) {
  const toggleMember = (memberId: string) => {
    const isSelected = filter.selectedMembers.includes(memberId)
    const newSelectedMembers = isSelected
      ? filter.selectedMembers.filter((id) => id !== memberId)
      : [...filter.selectedMembers, memberId]

    onFilterChange({ ...filter, selectedMembers: newSelectedMembers })
  }

  const allSelected = filter.selectedMembers.length === familyMembers.length
  const noneSelected = filter.selectedMembers.length === 0

  const toggleAll = () => {
    if (allSelected) {
      onFilterChange({ ...filter, selectedMembers: [] })
    } else {
      onFilterChange({ ...filter, selectedMembers: familyMembers.map((m) => m.id) })
    }
  }

  const toggleAllDayEvents = () => {
    onFilterChange({ ...filter, showAllDayEvents: !filter.showAllDayEvents })
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={toggleAll}
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
        const colors = colorMap[member.color]
        const isSelected = filter.selectedMembers.includes(member.id)

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
        )
      })}
    </div>
  )
}
