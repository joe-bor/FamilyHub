import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useFamilyMembers } from "@/api";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberSelector } from "@/components/ui/member-selector";
import { TimePicker } from "@/components/ui/time-picker";
import { getSmartDefaultTimes, parseLocalDate } from "@/lib/time-utils";
import { cn } from "@/lib/utils";
import { type EventFormData, eventFormSchema } from "@/lib/validations";

interface EventFormProps {
  mode: "add" | "edit";
  defaultValues?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
  isPending?: boolean;
}

function EventForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isPending = false,
}: EventFormProps) {
  const familyMembers = useFamilyMembers();

  /**
   * Get smart defaults for add mode
   * - Date: today
   * - Start time: next 15-min slot (clamped to visible calendar hours)
   * - End time: 1 hour after start
   * - Member: first family member
   */
  const getAddModeDefaults = useMemo((): Partial<EventFormData> => {
    const { startTime, endTime } = getSmartDefaultTimes();

    return {
      title: "",
      date: format(new Date(), "yyyy-MM-dd"),
      startTime,
      endTime,
      memberId: familyMembers[0]?.id ?? "",
    };
  }, [familyMembers]);

  // Use smart defaults for add mode, or provided defaults for edit mode
  const initialValues = useMemo(() => {
    if (mode === "add") {
      return { ...getAddModeDefaults, ...defaultValues };
    }
    return defaultValues || {};
  }, [mode, defaultValues, getAddModeDefaults]);

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
  // Use parseLocalDate to ensure consistent local timezone handling
  const dateAsDate = dateValue ? parseLocalDate(dateValue) : undefined;

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
          members={familyMembers}
          value={memberIdValue || familyMembers[0]?.id || ""}
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
