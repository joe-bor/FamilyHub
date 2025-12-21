import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberSelector } from "@/components/ui/member-selector";
import { TimePicker } from "@/components/ui/time-picker";
import { familyMembers } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type EventFormData, eventFormSchema } from "@/lib/validations";

interface EventFormProps {
  mode: "add" | "edit";
  defaultValues?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
  isPending?: boolean;
}

/**
 * Get smart defaults for add mode
 * - Date: today
 * - Start time: next 15-min slot
 * - End time: 1 hour after start
 * - Member: first family member
 */
function getAddModeDefaults(): Partial<EventFormData> {
  const now = new Date();

  // Round up to next 15-min interval (e.g., 9:23 -> 9:30)
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  now.setMinutes(roundedMinutes, 0, 0);

  // If we rounded to 60, the hour increments automatically
  if (roundedMinutes === 60) {
    now.setMinutes(0);
  }

  // End time = start time + 1 hour
  const endTime = new Date(now.getTime() + 60 * 60 * 1000);

  return {
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: format(now, "HH:mm"),
    endTime: format(endTime, "HH:mm"),
    memberId: familyMembers[0].id,
  };
}

function EventForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isPending = false,
}: EventFormProps) {
  // Use smart defaults for add mode, or provided defaults for edit mode
  const initialValues = useMemo(() => {
    if (mode === "add") {
      return { ...getAddModeDefaults(), ...defaultValues };
    }
    return defaultValues || {};
  }, [mode, defaultValues]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initialValues,
  });

  // Watch values for controlled components
  const dateValue = watch("date");
  const startTimeValue = watch("startTime");
  const endTimeValue = watch("endTime");
  const memberIdValue = watch("memberId");

  // Reset form when defaultValues change (e.g., switching between events in edit mode)
  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const handleFormSubmit = (data: EventFormData) => {
    if (isPending) return;
    onSubmit(data);
  };

  // Convert date string to Date object for DatePicker display
  // Append T00:00:00 to parse as local midnight (not UTC)
  const dateAsDate = dateValue ? new Date(dateValue + "T00:00:00") : undefined;

  const isAdd = mode === "add";
  const submitText = isAdd ? "Add Event" : "Save Changes";
  const pendingText = isAdd ? "Adding..." : "Saving...";

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Event Name */}
      <div className="space-y-2">
        <Label htmlFor="title">Event Name</Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="Enter event name"
          className={cn("bg-input", errors.title && "border-destructive")}
          aria-invalid={!!errors.title}
        />
        <FormError message={errors.title?.message} />
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label>Date</Label>
        <DatePicker
          value={dateAsDate}
          onChange={(date) => {
            setValue("date", date ? format(date, "yyyy-MM-dd") : "");
          }}
          placeholder="Pick a date"
          error={!!errors.date}
        />
        <FormError message={errors.date?.message} />
      </div>

      {/* Start/End Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Time</Label>
          <TimePicker
            value={startTimeValue}
            onChange={(time) => setValue("startTime", time)}
            placeholder="Start time"
            error={!!errors.startTime}
          />
          <FormError message={errors.startTime?.message} />
        </div>
        <div className="space-y-2">
          <Label>End Time</Label>
          <TimePicker
            value={endTimeValue}
            onChange={(time) => setValue("endTime", time)}
            placeholder="End time"
            error={!!errors.endTime}
          />
          <FormError message={errors.endTime?.message} />
        </div>
      </div>

      {/* Family Member */}
      <div className="space-y-2">
        <Label>Assign To</Label>
        <MemberSelector
          value={memberIdValue || familyMembers[0].id}
          onChange={(memberId) => setValue("memberId", memberId)}
          error={!!errors.memberId}
        />
        <FormError message={errors.memberId?.message} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 bg-transparent"
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-primary hover:bg-primary/90"
          disabled={isPending}
        >
          {isPending ? pendingText : submitText}
        </Button>
      </div>
    </form>
  );
}

export { EventForm };
export type { EventFormProps };
