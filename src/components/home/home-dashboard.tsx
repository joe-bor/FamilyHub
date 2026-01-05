import {
  Calendar,
  CheckSquare,
  ImageIcon,
  ListTodo,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ModuleType, useAppStore } from "@/stores";

const modules: Array<{
  id: ModuleType;
  label: string;
  icon: typeof Calendar;
  color: string;
}> = [
  { id: "calendar", label: "Calendar", icon: Calendar, color: "bg-purple-500" },
  { id: "lists", label: "Lists", icon: ListTodo, color: "bg-teal-500" },
  { id: "chores", label: "Chores", icon: CheckSquare, color: "bg-green-500" },
  {
    id: "meals",
    label: "Meals",
    icon: UtensilsCrossed,
    color: "bg-orange-500",
  },
  { id: "photos", label: "Photos", icon: ImageIcon, color: "bg-pink-500" },
];

export function HomeDashboard() {
  const setActiveModule = useAppStore((state) => state.setActiveModule);

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Home</h1>
        <p className="text-muted-foreground">What would you like to do?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <button
              type="button"
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-3 p-6 rounded-2xl",
                "text-white shadow-md active:scale-95 transition-transform",
                module.color,
              )}
            >
              <Icon className="h-10 w-10" />
              <span className="text-lg font-semibold">{module.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
