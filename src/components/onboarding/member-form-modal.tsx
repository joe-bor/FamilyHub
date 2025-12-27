import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
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
import { memberFormSchema } from "@/lib/validations/family";

type MemberFormData = z.infer<typeof memberFormSchema>;

interface MemberFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  member?: FamilyMember;
  usedColors: FamilyColor[];
  onSubmit: (data: MemberFormData) => void;
}

export function MemberFormModal({
  open,
  onOpenChange,
  mode,
  member,
  usedColors,
  onSubmit,
}: MemberFormModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
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
      <DialogContent className="w-full max-w-md mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Family Member" : "Edit Family Member"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Enter name"
              {...register("name")}
              autoComplete="off"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
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
