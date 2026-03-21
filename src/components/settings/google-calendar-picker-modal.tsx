import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useGoogleCalendars, useUpdateGoogleCalendars } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";

interface GoogleCalendarPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
}

export function GoogleCalendarPickerModal({
  open,
  onOpenChange,
  memberId,
}: GoogleCalendarPickerModalProps) {
  const { data: calendarsResponse, isLoading } = useGoogleCalendars(
    memberId,
    open,
  );
  const updateCalendars = useUpdateGoogleCalendars();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const calendars = calendarsResponse?.data ?? [];

  // Sort: primary first, then alphabetical
  const sortedCalendars = [...calendars].sort((a, b) => {
    if (a.primary && !b.primary) return -1;
    if (!a.primary && b.primary) return 1;
    return a.name.localeCompare(b.name);
  });

  // Sync local state when data loads
  useEffect(() => {
    if (calendars.length > 0) {
      setSelectedIds(
        new Set(calendars.filter((c) => c.enabled).map((c) => c.id)),
      );
    }
  }, [calendars]);

  const handleToggle = (calendarId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }
      return next;
    });
  };

  const handleSave = () => {
    updateCalendars.mutate(
      { memberId, calendarIds: Array.from(selectedIds) },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast({
            title: "Calendars updated",
            description: "Your calendar selection has been saved.",
          });
        },
        onError: () => {
          toast({
            title: "Update failed",
            description: "Could not save calendar selection.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Choose Calendars</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {sortedCalendars.map((cal) => (
              <label
                key={cal.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(cal.id)}
                  onChange={() => handleToggle(cal.id)}
                  className="rounded border-border"
                />
                <span className="text-sm">
                  {cal.name}
                  {cal.primary && (
                    <span className="text-muted-foreground ml-1">
                      (Primary)
                    </span>
                  )}
                </span>
              </label>
            ))}
            {sortedCalendars.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No calendars found
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateCalendars.isPending || isLoading}
          >
            {updateCalendars.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
