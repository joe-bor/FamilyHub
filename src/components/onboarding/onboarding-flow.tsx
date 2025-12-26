import { useState } from "react";
import type { z } from "zod";
import type { FamilyMember } from "@/lib/types";
import type { memberFormSchema } from "@/lib/validations/family";
import { useFamilyStore } from "@/stores";
import { OnboardingFamilyName } from "./onboarding-family-name";
import { OnboardingMembers } from "./onboarding-members";
import { OnboardingWelcome } from "./onboarding-welcome";

type MemberFormData = z.infer<typeof memberFormSchema>;

type Step = "welcome" | "family-name" | "members";

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("welcome");

  // Draft state - only persisted to store on final completion
  const [draftName, setDraftName] = useState("");
  const [draftMembers, setDraftMembers] = useState<FamilyMember[]>([]);

  // Store actions
  const initializeFamily = useFamilyStore((state) => state.initializeFamily);
  const setMembers = useFamilyStore((state) => state.setMembers);
  const completeSetup = useFamilyStore((state) => state.completeSetup);

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

  // Member management (draft state)
  const handleAddMember = (data: MemberFormData) => {
    const newMember: FamilyMember = {
      id: crypto.randomUUID(),
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

  // Final completion - persist to store
  const handleComplete = () => {
    initializeFamily(draftName);
    setMembers(draftMembers);
    completeSetup();
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
