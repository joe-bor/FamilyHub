import { LogOut, Users, X } from "lucide-react";
import { useState } from "react";
import { useFamilyMembers, useFamilyName, useLogout } from "@/api";
import { FamilySettingsModal, MemberProfileModal } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { colorMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores";

export function SidebarMenu() {
  const isOpen = useAppStore((state) => state.isSidebarOpen);
  const closeSidebar = useAppStore((state) => state.closeSidebar);

  // From family-store
  const familyName = useFamilyName();
  const familyMembers = useFamilyMembers();

  // Auth
  const logout = useLogout();

  // Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOpenMemberProfile = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const menuItems = [
    { icon: Users, label: "Family Settings", action: handleOpenSettings },
    { icon: LogOut, label: "Sign Out", action: logout },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-card shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {familyName || "Family Hub"}
            </h2>
            <p className="text-sm text-muted-foreground">Calendar Settings</p>
          </div>
          <Button variant="ghost" size="icon" onClick={closeSidebar}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Family Members */}
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Family Members
          </h3>
          <div className="space-y-2">
            {familyMembers.length > 0 ? (
              familyMembers.map((member) => {
                const colors = colorMap[member.color];
                return (
                  <button
                    key={member.id}
                    onClick={() => handleOpenMemberProfile(member.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-card text-sm font-bold",
                          colors?.bg,
                        )}
                      >
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {member.name}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground px-3">
                No family members yet
              </p>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Version */}
        <div className="border-t border-border px-6 py-4">
          <p className="text-xs text-muted-foreground">v{__APP_VERSION__}</p>
        </div>
      </aside>

      {/* Family Settings Modal */}
      <FamilySettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />

      {/* Member Profile Modal */}
      {selectedMemberId && (
        <MemberProfileModal
          open={!!selectedMemberId}
          onOpenChange={(open) => !open && setSelectedMemberId(null)}
          memberId={selectedMemberId}
        />
      )}
    </>
  );
}
