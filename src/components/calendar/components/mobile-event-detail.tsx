import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
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

  const isGoogleEvent = event.source === "GOOGLE";

  const handleEditClick = () => {
    if (isGoogleEvent) {
      toast({
        title: "Synced from Google Calendar",
        description: "Edit this event in Google Calendar.",
      });
      return;
    }
    onEdit();
  };

  const handleDeleteAttempt = () => {
    if (isGoogleEvent) {
      toast({
        title: "Synced from Google Calendar",
        description: "Delete this event in Google Calendar.",
      });
      return;
    }
    handleDeleteClick();
  };

  const colors = colorMap[member.color];
  const hexColor = colors.hex;

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
        className="flex flex-col px-4 pt-safe pb-5"
        style={{
          background: `linear-gradient(to bottom, ${hexColor}, ${hexColor}dd)`,
        }}
      >
        {/* Top bar: Back, Edit, Delete */}
        <div className="mb-4 flex items-center justify-between pt-2">
          <button
            type="button"
            aria-label="Back"
            onClick={onClose}
            className="flex items-center gap-1 rounded-lg py-1 pr-2 text-white/90 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditClick}
              disabled={isDeleting}
              className="h-9 px-3 text-white hover:bg-white/20 hover:text-white"
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteAttempt}
              disabled={isDeleting}
              className="h-9 px-3 text-white hover:bg-white/20 hover:text-white"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Event title */}
        <h1 className="mb-3 text-[24px] leading-8 font-semibold text-white">
          {event.title}
        </h1>

        {/* Member avatar + name */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: "rgba(255,255,255,0.35)" }}
          >
            {member.name.charAt(0)}
          </div>
          <span className="text-sm font-medium text-white/90">
            {member.name}
          </span>
        </div>
      </div>

      {/* Detail rows */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="space-y-4 px-4 py-5 text-[15px] leading-5">
          {/* Date */}
          <div className="flex items-center gap-3">
            <Calendar className={cn("h-5 w-5 shrink-0", colors.text)} />
            <span className="text-foreground">{formattedDate}</span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-3">
            <Clock className={cn("h-5 w-5 shrink-0", colors.text)} />
            {event.isAllDay ? (
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
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
              <Repeat className={cn("h-5 w-5 shrink-0", colors.text)} />
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
              <MapPin className={cn("h-5 w-5 shrink-0", colors.text)} />
              <span className="text-foreground truncate">{event.location}</span>
            </div>
          )}

          {/* Description (conditional) */}
          {event.description && (
            <div className="flex items-start gap-3">
              <FileText className={cn("h-5 w-5 shrink-0", colors.text)} />
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {event.description}
              </p>
            </div>
          )}

          {/* Open in Google Calendar (conditional) */}
          {isGoogleEvent && event.htmlLink && (
            <div className="flex items-center gap-3">
              <ExternalLink className={cn("h-5 w-5 shrink-0", colors.text)} />
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open in Google Calendar
              </a>
            </div>
          )}
        </div>

        {/* Error message */}
        {deleteError && (
          <div className="px-4 py-2 text-center text-sm text-destructive">
            Failed to delete event. Please try again.
          </div>
        )}
      </div>

      {/* Delete confirmation footer */}
      {showDeleteConfirm && (
        <div className="space-y-3 border-t border-border bg-background px-4 pb-safe pt-4">
          <p className="text-center text-sm text-muted-foreground">
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
