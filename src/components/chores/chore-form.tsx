import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useFamilyMembers } from "@/api";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberSelector } from "@/components/ui/member-selector";
import type { ChoreCadence } from "@/lib/types";
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
  const defaultTitle = defaultValues?.title;
  const defaultAssignedToMemberId = defaultValues?.assignedToMemberId;
  const defaultCadence = defaultValues?.cadence;

  const initialValues = useMemo(
    (): Partial<ChoreFormInput> => ({
      title: defaultTitle ?? "",
      assignedToMemberId:
        defaultAssignedToMemberId ?? familyMembers[0]?.id ?? "",
      cadence: defaultCadence ?? "DAILY",
    }),
    [defaultTitle, defaultAssignedToMemberId, defaultCadence, familyMembers],
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
  const cadence = watch("cadence") ?? "DAILY";

  const handleFormSubmit = (data: ChoreFormData) => {
    if (isPending) return;
    onSubmit(data);
  };

  const cadenceOptions: Array<{ value: ChoreCadence; label: string }> = [
    { value: "DAILY", label: "Daily" },
    { value: "WEEKLY", label: "Weekly" },
    { value: "MONTHLY", label: "Monthly" },
  ];

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
        <Label>Repeats</Label>
        <div className="grid grid-cols-3 gap-2">
          {cadenceOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={cadence === option.value ? "default" : "outline"}
              aria-pressed={cadence === option.value}
              onClick={() =>
                setValue("cadence", option.value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              className="min-w-0"
            >
              {option.label}
            </Button>
          ))}
        </div>
        <FormError message={errors.cadence?.message} />
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
