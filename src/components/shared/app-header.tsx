import { Cloud, Menu, Settings, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { colorMap } from "@/lib/types";
import {
  useAppStore,
  useCalendarStore,
  useFamilyMembers,
  useFamilyName,
} from "@/stores";

export function AppHeader() {
  // From calendar-store
  const currentDate = useCalendarStore((state) => state.currentDate);

  // From family-store
  const familyName = useFamilyName();
  const familyMembers = useFamilyMembers();

  // From app-store
  const openSidebar = useAppStore((state) => state.openSidebar);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Menu"
          className="text-muted-foreground hover:text-foreground"
          onClick={openSidebar}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {familyName || "Family Hub"}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{formatDate(currentDate)}</span>
            <span>•</span>
            <span>{formatTime(new Date())}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Weather */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="relative">
            <Sun className="h-5 w-5 text-yellow-500" />
            <Cloud className="h-4 w-4 text-gray-400 absolute -bottom-1 -right-1" />
          </div>
          <span className="text-sm font-medium">72°</span>
        </div>

        {/* Family member indicators */}
        {familyMembers.length > 0 && (
          <div className="flex items-center gap-1.5">
            {familyMembers.slice(0, 6).map((member) => (
              <div
                key={member.id}
                className={`w-3 h-3 rounded-full ${colorMap[member.color]?.bg || "bg-gray-300"}`}
                title={member.name}
              />
            ))}
          </div>
        )}

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
