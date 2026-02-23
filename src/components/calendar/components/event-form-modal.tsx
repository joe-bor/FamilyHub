import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format12hTo24h, formatLocalDate } from "@/lib/time-utils";
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
 * Transform a CalendarEvent to EventFormData for the form
 * Handles date formatting and time conversion (12h -> 24h)
 */
function eventToFormData(event: CalendarEvent): Partial<EventFormData> {
  return {
    title: event.title,
    date: formatLocalDate(event.date),
    startTime: format12hTo24h(event.startTime),
    endTime: format12hTo24h(event.endTime),
    memberId: event.memberId,
    location: event.location ?? undefined,
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
      <DialogContent aria-describedby={undefined}>
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
