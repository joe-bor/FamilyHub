import { Calendar, ListTodo, CheckSquare, UtensilsCrossed, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type TabType = "calendar" | "lists" | "chores" | "meals" | "photos"

interface NavigationTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs = [
  { id: "calendar" as TabType, label: "Calendar", icon: Calendar },
  { id: "lists" as TabType, label: "Lists", icon: ListTodo },
  { id: "chores" as TabType, label: "Chores", icon: CheckSquare },
  { id: "meals" as TabType, label: "Meals", icon: UtensilsCrossed },
  { id: "photos" as TabType, label: "Photos", icon: ImageIcon },
]

export function NavigationTabs({ activeTab, onTabChange }: NavigationTabsProps) {
  return (
    <nav className="w-20 flex flex-col items-center gap-2 py-6 bg-card border-r border-border shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
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
        )
      })}
    </nav>
  )
}
