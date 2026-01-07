import { useState } from "react";
import type { z } from "zod";
import { useCreateFamily } from "@/api";
import type { FamilyMember } from "@/lib/types";
import type { memberFormSchema } from "@/lib/validations/family";
import { OnboardingFamilyName } from "./onboarding-family-name";
import { OnboardingMembers } from "./onboarding-members";
import { OnboardingWelcome } from "./onboarding-welcome";

type MemberFormData = z.infer<typeof memberFormSchema>;

type Step = "welcome" | "family-name" | "members";

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("welcome");

  // Draft state - only persisted via API on final completion
  // Members have local IDs for UI purposes (React keys, edit/remove)
  const [draftName, setDraftName] = useState("");
  const [draftMembers, setDraftMembers] = useState<FamilyMember[]>([]);

  // API mutation for creating family
  const createFamily = useCreateFamily();

  // Navigation handlers
  const handleWelcomeNext = () => {
    setStep("family-name");
  };

  const handleFamilyNameNext = (name: string) => {
    setDraftName(name);
    setStep("members");
  };

  const handleFamilyNameBack = () => {
    setStep("welcome");
  };

  const handleMembersBack = () => {
    setStep("family-name");
  };

  // Member management (draft state with local IDs)
  const handleAddMember = (data: MemberFormData) => {
    const newMember: FamilyMember = {
      id: crypto.randomUUID(), // Local ID for UI, server will assign real IDs
      name: data.name,
      color: data.color,
    };
    setDraftMembers((prev) => [...prev, newMember]);
  };

  const handleEditMember = (id: string, data: MemberFormData) => {
    setDraftMembers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, name: data.name, color: data.color } : m,
      ),
    );
  };

  const handleRemoveMember = (id: string) => {
    setDraftMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Final completion - persist via API (strip local IDs, server assigns real ones)
  const handleComplete = () => {
    createFamily.mutate({
      name: draftName,
      members: draftMembers.map(({ name, color }) => ({ name, color })),
    });
  };

  switch (step) {
    case "welcome":
      return <OnboardingWelcome onNext={handleWelcomeNext} />;

    case "family-name":
      return (
        <OnboardingFamilyName
          initialName={draftName}
          onNext={handleFamilyNameNext}
          onBack={handleFamilyNameBack}
        />
      );

    case "members":
      return (
        <OnboardingMembers
          members={draftMembers}
          onAddMember={handleAddMember}
          onEditMember={handleEditMember}
          onRemoveMember={handleRemoveMember}
          onComplete={handleComplete}
          onBack={handleMembersBack}
        />
      );
  }
}
