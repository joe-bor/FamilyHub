import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatRecurrenceLabel } from "@/lib/recurrence-utils";
import type { CalendarEvent } from "@/lib/types";
import { colorMap, type FamilyColor } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MobileEventDetailProps {
  event: CalendarEvent;
  member: { id: string; name: string; color: FamilyColor };
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  deleteError?: string | null;
}

function MobileEventDetail({
  event,
  member,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  isDeleting = false,
  deleteError,
}: MobileEventDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset confirmation state when closed
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const colors = colorMap[member.color];
  // Extract hex from Tailwind class like "bg-[#e88470]" → "#e88470"
  const hexColor = colors.bg.replace("bg-[", "").replace("]", "");

  // Format date for display — multi-day shows range, single-day shows full date
  const formattedDate = event.endDate
    ? event.date.getFullYear() !== event.endDate.getFullYear()
      ? `${format(event.date, "MMMM d, yyyy")} – ${format(event.endDate, "MMMM d, yyyy")}`
      : `${format(event.date, "MMMM d")} – ${format(event.endDate, "MMMM d, yyyy")}`
    : format(event.date, "EEEE, MMMM d, yyyy");

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = () => {
    onDelete();
  };

  return (
    <div
      role="dialog"
      aria-label={event.title}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* Colored gradient header */}
      <div
        className="flex flex-col px-4 pt-safe pb-4"
        style={{
          background: `linear-gradient(to bottom, ${hexColor}, ${hexColor}dd)`,
        }}
      >
        {/* Top bar: Back, Edit, Delete */}
        <div className="flex items-center justify-between mb-4 pt-2">
          <button
            type="button"
            aria-label="Back"
            onClick={onClose}
            className="flex items-center gap-1 text-white/90 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              disabled={isDeleting}
              className="text-white hover:text-white hover:bg-white/20 h-9 px-3"
            >
              <Pencil className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="text-white hover:text-white hover:bg-white/20 h-9 px-3"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* Event title */}
        <h1 className="text-[22px] font-bold text-white leading-tight mb-3">
          {event.title}
        </h1>

        {/* Member avatar + name */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.35)" }}
          >
            {member.name.charAt(0)}
          </div>
          <span className="text-white/90 text-sm font-medium">
            {member.name}
          </span>
        </div>
      </div>

      {/* Detail rows */}
      <div className="flex-1 bg-background overflow-y-auto">
        <div className="px-4 py-5 space-y-4 text-sm">
          {/* Date */}
          <div className="flex items-center gap-3">
            <Calendar className={cn("w-5 h-5 shrink-0", colors.text)} />
            <span className="text-foreground">{formattedDate}</span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-3">
            <Clock className={cn("w-5 h-5 shrink-0", colors.text)} />
            {event.isAllDay ? (
              <span className="px-2 py-0.5 bg-muted rounded text-xs font-medium">
                All day
              </span>
            ) : (
              <span className="text-foreground">
                {event.startTime} – {event.endTime}
              </span>
            )}
          </div>

          {/* Recurrence (conditional) */}
          {event.isRecurring && (
            <div className="flex items-center gap-3">
              <Repeat className={cn("w-5 h-5 shrink-0", colors.text)} />
              <span className="text-foreground">
                {event.recurrenceRule
                  ? formatRecurrenceLabel(event.recurrenceRule, event.date)
                  : "Recurring event"}
              </span>
            </div>
          )}

          {/* Location (conditional) */}
          {event.location && (
            <div className="flex items-center gap-3">
              <MapPin className={cn("w-5 h-5 shrink-0", colors.text)} />
              <span className="text-foreground truncate">{event.location}</span>
            </div>
          )}
        </div>

        {/* Error message */}
        {deleteError && (
          <div className="px-4 text-destructive text-sm text-center py-2">
            Failed to delete event. Please try again.
          </div>
        )}
      </div>

      {/* Delete confirmation footer */}
      {showDeleteConfirm && (
        <div className="px-4 pb-safe pt-4 border-t border-border space-y-3 bg-background">
          <p className="text-sm text-muted-foreground text-center">
            Are you sure you want to delete this event?
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="flex-1 min-h-[48px]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex-1 min-h-[48px]"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Event"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { MobileEventDetailProps };
export { MobileEventDetail };
