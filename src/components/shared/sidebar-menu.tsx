import { LogOut, SlidersHorizontal, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFamilyMembers, useFamilyName, useLogout } from "@/api";
import {
  FamilySettingsModal,
  MemberProfileModal,
  PreferencesSheet,
} from "@/components/settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SideSheet } from "@/components/ui/side-sheet";
import { colorMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores";

export function SidebarMenu() {
  const isOpen = useAppStore((state) => state.isSidebarOpen);
  const closeSidebar = useAppStore((state) => state.closeSidebar);

  const familyName = useFamilyName();
  const familyMembers = useFamilyMembers();
  const logout = useLogout();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const autoOpenMemberId = sessionStorage.getItem("open-member-profile");
      if (autoOpenMemberId) {
        sessionStorage.removeItem("open-member-profile");
        setSelectedMemberId(autoOpenMemberId);
      }
    }
  }, [isOpen]);

  const menuItems = [
    {
      icon: Users,
      label: "Family Settings",
      action: () => setIsSettingsOpen(true),
    },
    {
      icon: SlidersHorizontal,
      label: "Preferences",
      action: () => setIsPreferencesOpen(true),
    },
    {
      icon: LogOut,
      label: "Sign Out",
      action: () => setShowSignOutConfirm(true),
    },
  ];

  return (
    <>
      <SideSheet
        open={isOpen}
        onOpenChange={(open) => !open && closeSidebar()}
        title="Menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {familyName || "Family Hub"}
            </h2>
            <p className="text-sm text-muted-foreground">Menu</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close menu"
            onClick={closeSidebar}
            className="h-11 w-11"
          >
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
                    type="button"
                    onClick={() => setSelectedMemberId(member.id)}
                    className="w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
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
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="w-full min-h-11 flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
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
      </SideSheet>

      {/* Family Settings Modal */}
      <FamilySettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />

      {/* Preferences Sheet */}
      <PreferencesSheet
        open={isPreferencesOpen}
        onOpenChange={setIsPreferencesOpen}
      />

      {/* Member Profile Modal */}
      {selectedMemberId && (
        <MemberProfileModal
          open={!!selectedMemberId}
          onOpenChange={(open) => !open && setSelectedMemberId(null)}
          memberId={selectedMemberId}
        />
      )}

      {/* Sign Out Confirmation */}
      <Dialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>
              You'll need your family username and password to sign back in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowSignOutConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => logout()}>
              Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
