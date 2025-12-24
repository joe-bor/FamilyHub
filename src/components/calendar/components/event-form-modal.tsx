import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseTime } from "@/lib/time-utils";
import type { CalendarEvent } from "@/lib/types";
import type { EventFormData } from "@/lib/validations";
import { EventForm } from "./event-form";

interface EventFormModalProps {
  mode: "add" | "edit";
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EventFormData) => void;
  isPending?: boolean;
  /** For edit mode: the event to pre-populate the form with */
  event?: CalendarEvent;
}

/**
 * Convert 12h time (e.g., "4:00 PM") to 24h format (e.g., "16:00")
 * The form/TimePicker uses 24h format internally
 */
function convertTo24hFormat(timeStr: string): string {
  const { hours, minutes } = parseTime(timeStr);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Transform a CalendarEvent to EventFormData for the form
 * Handles date formatting and time conversion (12h -> 24h)
 */
function eventToFormData(event: CalendarEvent): Partial<EventFormData> {
  // Format date as yyyy-MM-dd string using local timezone (not UTC)
  // toISOString() would convert to UTC and shift the date incorrectly
  const dateStr =
    event.date instanceof Date
      ? format(event.date, "yyyy-MM-dd")
      : String(event.date).split("T")[0];

  return {
    title: event.title,
    date: dateStr,
    startTime: convertTo24hFormat(event.startTime),
    endTime: convertTo24hFormat(event.endTime),
    memberId: event.memberId,
    location: event.location,
    isAllDay: event.isAllDay,
  };
}

function EventFormModal({
  mode,
  isOpen,
  onClose,
  onSubmit,
  isPending = false,
  event,
}: EventFormModalProps) {
  const title = mode === "add" ? "Add Event" : "Edit Event";

  // For edit mode, convert the event to form data
  const defaultValues = event ? eventToFormData(event) : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader onClose={onClose}>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <EventForm
          mode={mode}
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          onCancel={onClose}
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

export { EventFormModal };
export type { EventFormModalProps };
