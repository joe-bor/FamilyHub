import { zodResolver } from "@hookform/resolvers/zod";
import { parseISO } from "date-fns";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type CalendarEvent, colorMap, familyMembers } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type EventFormData, eventFormSchema } from "@/lib/validations";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (event: Omit<CalendarEvent, "id">) => void;
  isPending?: boolean;
}

export function AddEventModal({
  isOpen,
  onClose,
  onAdd,
  isPending = false,
}: AddEventModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      date: "",
      startTime: "",
      endTime: "",
      memberId: familyMembers[0].id,
    },
  });

  const selectedMember = watch("memberId");

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = (data: EventFormData) => {
    if (isPending) return;

    onAdd({
      title: data.title,
      date: parseISO(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      memberId: data.memberId,
    });

    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Add Event</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...register("date")}
              className={cn("bg-input", errors.date && "border-destructive")}
              aria-invalid={!!errors.date}
            />
            <FormError message={errors.date?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                {...register("startTime")}
                className={cn(
                  "bg-input",
                  errors.startTime && "border-destructive",
                )}
                aria-invalid={!!errors.startTime}
              />
              <FormError message={errors.startTime?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                {...register("endTime")}
                className={cn(
                  "bg-input",
                  errors.endTime && "border-destructive",
                )}
                aria-invalid={!!errors.endTime}
              />
              <FormError message={errors.endTime?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign To</Label>
            <div className="flex flex-wrap gap-2">
              {familyMembers.map((member) => {
                const colors = colorMap[member.color];
                const isSelected = selectedMember === member.id;

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setValue("memberId", member.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all",
                      isSelected
                        ? `${colors?.bg} text-card`
                        : `${colors?.light} ${colors?.text} hover:opacity-80`,
                    )}
                  >
                    <div className={cn("w-3 h-3 rounded-full", colors?.bg)} />
                    {member.name}
                  </button>
                );
              })}
            </div>
            <FormError message={errors.memberId?.message} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
              {isPending ? "Adding..." : "Add Event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
