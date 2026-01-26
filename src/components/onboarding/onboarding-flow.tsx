import { useCallback, useState } from "react";
import type { z } from "zod";
import { ApiException, useRegister } from "@/api";
import type { FamilyMember } from "@/lib/types";
import type { memberFormSchema } from "@/lib/validations/family";
import { useAuthStore } from "@/stores";
import { OnboardingCredentials } from "./onboarding-credentials";
import { OnboardingFamilyName } from "./onboarding-family-name";
import { OnboardingMembers } from "./onboarding-members";
import { OnboardingWelcome } from "./onboarding-welcome";

type MemberFormData = z.infer<typeof memberFormSchema>;

type Step = "welcome" | "family-name" | "members" | "credentials";

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("welcome");

  // Draft state - only persisted via API on final completion
  // Members have local IDs for UI purposes (React keys, edit/remove)
  const [draftName, setDraftName] = useState("");
  const [draftMembers, setDraftMembers] = useState<FamilyMember[]>([]);
  const [registrationError, setRegistrationError] = useState<string | null>(
    null,
  );

  // API mutation for registering family with credentials
  const registerFamily = useRegister();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

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

  // Navigate from members to credentials step
  const handleMembersNext = () => {
    setStep("credentials");
  };

  const handleCredentialsBack = () => {
    setStep("members");
  };

  // Map API error codes to user-friendly messages
  const getRegistrationErrorMessage = useCallback((error: unknown): string => {
    if (ApiException.isApiException(error)) {
      switch (error.code) {
        case "CONFLICT":
          return "This username was just taken. Please choose another.";
        case "NETWORK_ERROR":
          return "Unable to connect. Please check your internet and try again.";
        case "TIMEOUT":
          return "Request timed out. Please try again.";
        case "VALIDATION_ERROR":
          return "Invalid data. Please check your entries and try again.";
        case "SERVER_ERROR":
          return "Something went wrong on our end. Please try again.";
      }
    }
    return "Registration failed. Please try again.";
  }, []);

  // Final completion - register with credentials (strip local IDs, server assigns real ones)
  const handleCredentialsNext = (username: string, password: string) => {
    // Clear any previous error before attempting registration
    setRegistrationError(null);

    registerFamily.mutate(
      {
        username,
        password,
        familyName: draftName,
        members: draftMembers.map(({ name, color }) => ({ name, color })),
      },
      {
        onSuccess: () => {
          // Update auth store to trigger re-render
          setAuthenticated(true);
        },
        onError: (error) => {
          setRegistrationError(getRegistrationErrorMessage(error));
        },
      },
    );
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
          onNext={handleMembersNext}
          onBack={handleMembersBack}
        />
      );

    case "credentials":
      return (
        <OnboardingCredentials
          onNext={handleCredentialsNext}
          onBack={handleCredentialsBack}
          isSubmitting={registerFamily.isPending}
          error={registrationError}
        />
      );
  }
}
