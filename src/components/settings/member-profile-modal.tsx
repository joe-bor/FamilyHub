import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { colorMap, type FamilyColor } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  useFamilyActions,
  useFamilyMemberById,
  useFamilyMembers,
} from "@/stores";

/**
 * Schema for member profile form.
 */
const createProfileSchema = (existingNames: string[], currentName?: string) => {
  const lowerNames = existingNames
    .filter((n) => n.toLowerCase() !== currentName?.toLowerCase())
    .map((n) => n.toLowerCase());

  return z.object({
    name: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(1, "Name is required")
          .max(30, "Name must be 30 characters or less")
          .refine((val) => !lowerNames.includes(val.toLowerCase()), {
            message: "A member with this name already exists",
          }),
      ),
    color: z.enum([
      "coral",
      "teal",
      "green",
      "purple",
      "yellow",
      "pink",
      "orange",
    ]),
    email: z
      .string()
      .transform((val) => val.trim())
      .refine(
        (val) => val === "" || z.string().email().safeParse(val).success,
        { message: "Please enter a valid email" },
      ),
  });
};

type ProfileFormData = z.infer<ReturnType<typeof createProfileSchema>>;

interface MemberProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
}

export function MemberProfileModal({
  open,
  onOpenChange,
  memberId,
}: MemberProfileModalProps) {
  const member = useFamilyMemberById(memberId);
  const familyMembers = useFamilyMembers();
  const { updateMember } = useFamilyActions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingNames = familyMembers.map((m) => m.name);
  const usedColors = familyMembers
    .filter((m) => m.id !== memberId)
    .map((m) => m.color);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(createProfileSchema(existingNames, member?.name)),
    defaultValues: {
      name: member?.name ?? "",
      color: member?.color ?? "coral",
      email: member?.email ?? "",
    },
  });

  const selectedColor = watch("color");

  // Reset form when member changes
  useEffect(() => {
    if (member) {
      reset({
        name: member.name,
        color: member.color,
        email: member.email ?? "",
      });
    }
  }, [member, reset]);

  if (!member) return null;

  const onSubmit = (data: ProfileFormData) => {
    updateMember(memberId, {
      name: data.name,
      color: data.color,
      email: data.email || undefined,
    });
    onOpenChange(false);
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Validate file size (max 500KB for localStorage)
    if (file.size > 500 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      updateMember(memberId, { avatarUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    updateMember(memberId, { avatarUrl: undefined });
  };

  const colors = colorMap[member.color];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Member Profile</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold",
                    colors?.bg,
                  )}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                aria-label="Upload avatar"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              aria-label="Upload avatar image"
            />
            {member.avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                className="text-muted-foreground gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Remove photo
              </Button>
            )}
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register("name")}
              aria-describedby={errors.name ? "name-error" : undefined}
              aria-invalid={errors.name ? "true" : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker
              value={selectedColor}
              onChange={(color) =>
                setValue("color", color, { shouldDirty: true })
              }
              usedColors={usedColors as FamilyColor[]}
              error={errors.color?.message}
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              {...register("email")}
              aria-describedby={
                errors.email ? "email-error" : "email-description"
              }
              aria-invalid={errors.email ? "true" : undefined}
            />
            {errors.email ? (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            ) : (
              <p
                id="email-description"
                className="text-xs text-muted-foreground"
              >
                Used for Google Calendar sync (coming soon)
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty}>
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
