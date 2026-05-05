import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useFamilyMembers } from "@/api";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberSelector } from "@/components/ui/member-selector";
import { formatLocalDate, parseLocalDate } from "@/lib/time-utils";
import { cn } from "@/lib/utils";
import {
  type ChoreFormData,
  type ChoreFormInput,
  choreFormSchema,
} from "@/lib/validations";

interface ChoreFormProps {
  defaultValues?: Partial<ChoreFormInput>;
  onSubmit: (data: ChoreFormData) => void;
  onCancel: () => void;
  isPending?: boolean;
  hideCancelButton?: boolean;
}

export function ChoreForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending = false,
  hideCancelButton = false,
}: ChoreFormProps) {
  const familyMembers = useFamilyMembers();

  const initialValues = useMemo(
    (): Partial<ChoreFormInput> => ({
      title: "",
      assignedToMemberId: "",
      dueDate: undefined,
      ...defaultValues,
    }),
    [defaultValues],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChoreFormInput, undefined, ChoreFormData>({
    resolver: zodResolver(choreFormSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const assignedToMemberId = watch("assignedToMemberId") ?? "";
  const dueDateValue = watch("dueDate");
  const dueDateAsDate = dueDateValue ? parseLocalDate(dueDateValue) : undefined;

  const handleFormSubmit = (data: ChoreFormData) => {
    if (isPending) return;
    onSubmit(data);
  };

  return (
    <form
      id="chore-form"
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="chore-title">Chore Name</Label>
        <Input
          id="chore-title"
          {...register("title")}
          placeholder="What needs doing?"
          className={cn("bg-input", errors.title && "border-destructive")}
          aria-invalid={!!errors.title}
        />
        <FormError message={errors.title?.message} />
      </div>

      <div className="space-y-2">
        <Label>Assign To</Label>
        <MemberSelector
          members={familyMembers}
          value={assignedToMemberId}
          onChange={(memberId) =>
            setValue("assignedToMemberId", memberId, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          error={!!errors.assignedToMemberId}
        />
        <FormError message={errors.assignedToMemberId?.message} />
      </div>

      <div className="space-y-2">
        <Label>Due Date</Label>
        <div className="flex gap-2">
          <DatePicker
            value={dueDateAsDate}
            onChange={(date) =>
              setValue("dueDate", date ? formatLocalDate(date) : undefined, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            placeholder="No due date"
            error={!!errors.dueDate}
          />
          {dueDateValue && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Clear due date"
              onClick={() =>
                setValue("dueDate", undefined, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <FormError message={errors.dueDate?.message} />
      </div>

      <div className="flex gap-3 pt-3">
        {!hideCancelButton && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 bg-transparent"
            disabled={isPending}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1 bg-primary hover:bg-primary/90"
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Save Chore"}
        </Button>
      </div>
    </form>
  );
}

export type { ChoreFormProps };
