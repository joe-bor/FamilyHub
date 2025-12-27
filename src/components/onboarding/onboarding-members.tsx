import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import type { FamilyColor, FamilyMember } from "@/lib/types";
import type { memberFormSchema } from "@/lib/validations/family";
import { MemberCard } from "./member-card";
import { MemberFormModal } from "./member-form-modal";

type MemberFormData = z.infer<typeof memberFormSchema>;

interface OnboardingMembersProps {
  members: FamilyMember[];
  onAddMember: (data: MemberFormData) => void;
  onEditMember: (id: string, data: MemberFormData) => void;
  onRemoveMember: (id: string) => void;
  onComplete: () => void;
  onBack: () => void;
}

export function OnboardingMembers({
  members,
  onAddMember,
  onEditMember,
  onRemoveMember,
  onComplete,
  onBack,
}: OnboardingMembersProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  const usedColors = members.map((m) => m.color);
  // For editing, exclude the current member's color from the "used" list
  const usedColorsForForm = editingMember
    ? usedColors.filter((c) => c !== editingMember.color)
    : usedColors;

  const handleAddClick = () => {
    setEditingMember(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (member: FamilyMember) => {
    setEditingMember(member);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data: MemberFormData) => {
    if (editingMember) {
      onEditMember(editingMember.id, data);
    } else {
      onAddMember(data);
    }
    setEditingMember(null);
  };

  const canAddMore = members.length < 7; // Max 7 members (one per color)
  const canComplete = members.length >= 1;

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-6 bg-background">
      {/* Header with back button */}
      <div className="flex items-center gap-2 mb-8">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">Step 2 of 2</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <div className="space-y-3 text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Who's in your family?
          </h1>
          <p className="text-muted-foreground">
            Add each family member with their own color.
          </p>
        </div>

        {/* Members list */}
        <div className="flex-1 space-y-3">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onEdit={() => handleEditClick(member)}
              onRemove={() => onRemoveMember(member.id)}
              canRemove={members.length > 1}
            />
          ))}

          {/* Add member button */}
          {canAddMore && (
            <button
              type="button"
              onClick={handleAddClick}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add Family Member</span>
            </button>
          )}

          {!canAddMore && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Maximum of 7 family members reached
            </p>
          )}
        </div>

        {/* Complete button */}
        <div className="pt-6">
          <Button
            size="lg"
            className="w-full"
            onClick={onComplete}
            disabled={!canComplete}
          >
            Complete Setup
          </Button>
          {!canComplete && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Add at least one family member to continue
            </p>
          )}
        </div>
      </div>

      {/* Member form modal */}
      <MemberFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        mode={editingMember ? "edit" : "add"}
        member={editingMember ?? undefined}
        usedColors={usedColorsForForm as FamilyColor[]}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
