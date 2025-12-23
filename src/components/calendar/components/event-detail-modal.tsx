import { format } from "date-fns";
import { Calendar, Clock, MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CalendarEvent } from "@/lib/types";
import { colorMap, getFamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EventDetailModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  deleteError?: string | null;
}

function EventDetailModal({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  isDeleting = false,
  deleteError,
}: EventDetailModalProps) {
  if (!event) return null;

  const member = getFamilyMember(event.memberId);
  const colors = member ? colorMap[member.color] : null;

  // Format date for display (e.g., "Monday, December 23, 2025")
  const formattedDate = format(event.date, "EEEE, MMMM d, yyyy");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader onClose={onClose}>
          <DialogTitle className="pr-8 truncate">{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Member badge */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0",
                colors?.bg ? `bg-[${colors.bg}]` : "bg-muted-foreground",
              )}
              style={{ backgroundColor: colors?.bg }}
            >
              {member?.name.charAt(0)}
            </div>
            <span className="font-medium text-foreground">{member?.name}</span>
          </div>

          {/* Event details */}
          <div className="space-y-3 text-sm">
            {/* Date */}
            <div className="flex items-center gap-3 text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{formattedDate}</span>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              {event.isAllDay ? (
                <span className="px-2 py-0.5 bg-muted rounded text-xs font-medium">
                  All day
                </span>
              ) : (
                <span>
                  {event.startTime} – {event.endTime}
                </span>
              )}
            </div>

            {/* Location (conditional) */}
            {event.location && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>

          {/* Error message */}
          {deleteError && (
            <div className="text-destructive text-sm text-center py-2">
              Failed to delete event. Please try again.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onEdit}
            disabled={isDeleting}
            className="flex-1 min-h-[48px]"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={isDeleting}
            className="flex-1 min-h-[48px]"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { EventDetailModal };
export type { EventDetailModalProps };
