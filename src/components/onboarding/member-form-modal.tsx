import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FamilyColor, FamilyMember } from "@/lib/types";
import {
  createMemberFormSchema,
  type MemberFormData,
} from "@/lib/validations/family";

interface MemberFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  member?: FamilyMember;
  usedColors: FamilyColor[];
  existingNames: string[];
  onSubmit: (data: MemberFormData) => void;
}

export function MemberFormModal({
  open,
  onOpenChange,
  mode,
  member,
  usedColors,
  existingNames,
  onSubmit,
}: MemberFormModalProps) {
  // Create schema with duplicate name validation
  // In edit mode, exclude current member's name from duplicate check
  const schema = useMemo(
    () =>
      createMemberFormSchema(
        existingNames,
        mode === "edit" ? member?.name : undefined,
      ),
    [existingNames, mode, member?.name],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      color: undefined,
    },
  });

  // Reset form when modal opens/closes or member changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && member) {
        reset({ name: member.name, color: member.color });
      } else {
        reset({ name: "", color: undefined });
      }
    }
  }, [open, mode, member, reset]);

  const selectedColor = watch("color");

  const handleFormSubmit = (data: MemberFormData) => {
    onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-md mx-4 sm:mx-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Family Member" : "Edit Family Member"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="member-name">Name</Label>
            <Input
              id="member-name"
              placeholder="Enter name"
              {...register("name")}
              autoComplete="off"
              aria-describedby={errors.name ? "member-name-error" : undefined}
              aria-invalid={errors.name ? "true" : undefined}
            />
            {errors.name && (
              <p id="member-name-error" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker
              value={selectedColor}
              onChange={(color) => setValue("color", color)}
              usedColors={usedColors}
              error={errors.color?.message}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{mode === "add" ? "Add" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
