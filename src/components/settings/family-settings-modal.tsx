import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Plus, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { MemberCard, MemberFormModal } from "@/components/onboarding";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FamilyColor, FamilyMember } from "@/lib/types";
import {
  familyNameSchema,
  type memberFormSchema,
} from "@/lib/validations/family";
import { useFamilyActions, useFamilyMembers, useFamilyName } from "@/stores";

type FamilyNameFormData = z.infer<typeof familyNameSchema>;
type MemberFormData = z.infer<typeof memberFormSchema>;

interface FamilySettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FamilySettingsModal({
  open,
  onOpenChange,
}: FamilySettingsModalProps) {
  const familyName = useFamilyName();
  const familyMembers = useFamilyMembers();
  const {
    updateFamilyName,
    addMember,
    updateMember,
    removeMember,
    resetFamily,
  } = useFamilyActions();

  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Family name form
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset: resetForm,
  } = useForm<FamilyNameFormData>({
    resolver: zodResolver(familyNameSchema),
    defaultValues: { name: familyName },
  });

  const onSaveName = (data: FamilyNameFormData) => {
    updateFamilyName(data.name);
    resetForm({ name: data.name });
  };

  // Member management
  const usedColors = familyMembers.map((m) => m.color);
  const usedColorsForForm = editingMember
    ? usedColors.filter((c) => c !== editingMember.color)
    : usedColors;

  const handleAddMember = () => {
    setEditingMember(null);
    setIsMemberFormOpen(true);
  };

  const handleEditMember = (member: FamilyMember) => {
    setEditingMember(member);
    setIsMemberFormOpen(true);
  };

  const handleMemberFormSubmit = (data: MemberFormData) => {
    if (editingMember) {
      updateMember(editingMember.id, data);
    } else {
      addMember(data);
    }
    setEditingMember(null);
  };

  // Reset family
  const handleResetFamily = () => {
    resetFamily();
    onOpenChange(false);
  };

  const canAddMore = familyMembers.length < 7;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">Family Settings</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-8 py-4">
            {/* Family Name Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Family Name
              </h3>
              <form
                onSubmit={handleSubmit(onSaveName)}
                className="flex gap-2 items-start"
              >
                <div className="flex-1 space-y-1">
                  <Label htmlFor="familyName" className="sr-only">
                    Family Name
                  </Label>
                  <Input
                    id="familyName"
                    placeholder="Enter family name"
                    {...register("name")}
                    aria-describedby={
                      errors.name ? "family-name-error" : undefined
                    }
                    aria-invalid={errors.name ? "true" : undefined}
                  />
                  {errors.name && (
                    <p
                      id="family-name-error"
                      className="text-sm text-destructive"
                    >
                      {errors.name.message}
                    </p>
                  )}
                </div>
                {isDirty && (
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                )}
              </form>
            </section>

            {/* Family Members Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Family Members
                </h3>
                {canAddMore && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddMember}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {familyMembers.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    onEdit={() => handleEditMember(member)}
                    onRemove={() => removeMember(member.id)}
                    canRemove={familyMembers.length > 1}
                  />
                ))}
              </div>

              {!canAddMore && (
                <p className="text-sm text-muted-foreground text-center">
                  Maximum of 7 family members reached
                </p>
              )}
            </section>

            {/* Danger Zone */}
            <section className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider">
                Danger Zone
              </h3>
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Reset Family</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This will delete all family data and return to the setup
                      wizard. This action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowResetConfirm(true)}
                      className="mt-3"
                    >
                      Reset Family
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Form Modal */}
      <MemberFormModal
        open={isMemberFormOpen}
        onOpenChange={setIsMemberFormOpen}
        mode={editingMember ? "edit" : "add"}
        member={editingMember ?? undefined}
        usedColors={usedColorsForForm as FamilyColor[]}
        existingNames={familyMembers.map((m) => m.name)}
        onSubmit={handleMemberFormSubmit}
      />

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Family?</DialogTitle>
            <DialogDescription>
              This will permanently delete all family data including members and
              their events. You'll need to set up your family again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetFamily}>
              Yes, Reset Everything
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
