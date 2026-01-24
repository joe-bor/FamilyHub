import { ApiErrorCode, ApiException } from "@/api/client";
import { FAMILY_STORAGE_KEY } from "@/lib/constants";
import type {
  AddMemberRequest,
  CreateFamilyRequest,
  FamilyApiResponse,
  FamilyData,
  FamilyMember,
  FamilyMutationResponse,
  MemberMutationResponse,
  UpdateFamilyRequest,
  UpdateMemberRequest,
} from "@/lib/types";
import { simulateApiCall } from "./delay";

// ============================================================================
// Persistence Helpers
// ============================================================================

/**
 * Save family data to localStorage.
 * Matches the Zustand persist format for compatibility.
 */
function saveFamilyToStorage(family: FamilyData | null): void {
  try {
    if (family === null) {
      localStorage.removeItem(FAMILY_STORAGE_KEY);
    } else {
      // Match Zustand persist format: { state: { family, _hasHydrated }, version }
      const stored = {
        state: {
          family,
          _hasHydrated: true,
        },
        version: 0,
      };
      localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(stored));
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to save family data to localStorage:", error);
    }
  }
}

/**
 * Load family data from localStorage.
 */
function loadFamilyFromStorage(): FamilyData | null {
  try {
    const stored = localStorage.getItem(FAMILY_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return parsed?.state?.family ?? null;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to load family data from localStorage:", error);
    }
    return null;
  }
}

// ============================================================================
// Response Helpers
// ============================================================================

function createFamilyResponse(family: FamilyData | null): FamilyApiResponse {
  return { data: family };
}

function createFamilyMutationResponse(
  family: FamilyData,
  message: string,
): FamilyMutationResponse {
  return { data: family, message };
}

function createMemberMutationResponse(
  member: FamilyMember,
  message: string,
): MemberMutationResponse {
  return { data: member, message };
}

// ============================================================================
// Mock Handlers
// ============================================================================

export const familyMockHandlers = {
  /**
   * Get the current family data.
   * Returns null if no family exists (triggers onboarding).
   */
  async getFamily(): Promise<FamilyApiResponse> {
    await simulateApiCall({ delayMin: 100, delayMax: 300 });
    const family = loadFamilyFromStorage();
    return createFamilyResponse(family);
  },

  /**
   * Create a new family (during onboarding).
   * Generates IDs for family and all members.
   */
  async createFamily(
    request: CreateFamilyRequest,
  ): Promise<FamilyMutationResponse> {
    await simulateApiCall();

    // Check if family already exists
    const existing = loadFamilyFromStorage();
    if (existing) {
      throw new ApiException({
        code: ApiErrorCode.CONFLICT,
        message: "Family already exists. Use updateFamily to modify.",
        status: 409,
      });
    }

    // Create family with generated IDs
    const family: FamilyData = {
      id: crypto.randomUUID(),
      name: request.name,
      members: request.members.map((m) => ({
        ...m,
        id: crypto.randomUUID(),
      })),
      createdAt: new Date().toISOString(),
      setupComplete: true, // Mark setup as complete when family is created via API
    };

    saveFamilyToStorage(family);
    return createFamilyMutationResponse(family, "Family created successfully");
  },

  /**
   * Update family properties (e.g., name).
   */
  async updateFamily(
    request: UpdateFamilyRequest,
  ): Promise<FamilyMutationResponse> {
    await simulateApiCall();

    const family = loadFamilyFromStorage();
    if (!family) {
      throw new ApiException({
        code: ApiErrorCode.NOT_FOUND,
        message: "No family exists. Create one first.",
        status: 404,
      });
    }

    const updatedFamily: FamilyData = {
      ...family,
      name: request.name ?? family.name,
    };

    saveFamilyToStorage(updatedFamily);
    return createFamilyMutationResponse(
      updatedFamily,
      "Family updated successfully",
    );
  },

  /**
   * Add a new member to the family.
   */
  async addMember(request: AddMemberRequest): Promise<MemberMutationResponse> {
    await simulateApiCall();

    const family = loadFamilyFromStorage();
    if (!family) {
      throw new ApiException({
        code: ApiErrorCode.NOT_FOUND,
        message: "No family exists. Create one first.",
        status: 404,
      });
    }

    // Check for max members (7 colors = 7 members max)
    if (family.members.length >= 7) {
      throw new ApiException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Maximum of 7 family members allowed",
        status: 400,
      });
    }

    // Check for duplicate color
    if (family.members.some((m) => m.color === request.color)) {
      throw new ApiException({
        code: ApiErrorCode.CONFLICT,
        message: `Color "${request.color}" is already assigned to another member`,
        status: 409,
      });
    }

    const newMember: FamilyMember = {
      id: crypto.randomUUID(),
      name: request.name,
      color: request.color,
      avatarUrl: request.avatarUrl,
      email: request.email,
    };

    const updatedFamily: FamilyData = {
      ...family,
      members: [...family.members, newMember],
    };

    saveFamilyToStorage(updatedFamily);
    return createMemberMutationResponse(newMember, "Member added successfully");
  },

  /**
   * Update an existing member.
   */
  async updateMember(
    request: UpdateMemberRequest,
  ): Promise<MemberMutationResponse> {
    await simulateApiCall();

    const family = loadFamilyFromStorage();
    if (!family) {
      throw new ApiException({
        code: ApiErrorCode.NOT_FOUND,
        message: "No family exists",
        status: 404,
      });
    }

    const memberIndex = family.members.findIndex((m) => m.id === request.id);
    if (memberIndex === -1) {
      throw new ApiException({
        code: ApiErrorCode.NOT_FOUND,
        message: `Member with id "${request.id}" not found`,
        status: 404,
      });
    }

    // Check for color conflict with other members
    if (
      request.color &&
      family.members.some(
        (m) => m.id !== request.id && m.color === request.color,
      )
    ) {
      throw new ApiException({
        code: ApiErrorCode.CONFLICT,
        message: `Color "${request.color}" is already assigned to another member`,
        status: 409,
      });
    }

    const existingMember = family.members[memberIndex];
    const updatedMember: FamilyMember = {
      ...existingMember,
      name: request.name ?? existingMember.name,
      color: request.color ?? existingMember.color,
      avatarUrl:
        request.avatarUrl !== undefined
          ? request.avatarUrl
          : existingMember.avatarUrl,
      email: request.email !== undefined ? request.email : existingMember.email,
    };

    const updatedFamily: FamilyData = {
      ...family,
      members: [
        ...family.members.slice(0, memberIndex),
        updatedMember,
        ...family.members.slice(memberIndex + 1),
      ],
    };

    saveFamilyToStorage(updatedFamily);
    return createMemberMutationResponse(
      updatedMember,
      "Member updated successfully",
    );
  },

  /**
   * Remove a member from the family.
   */
  async removeMember(id: string): Promise<void> {
    await simulateApiCall({ delayMin: 150, delayMax: 350 });

    const family = loadFamilyFromStorage();
    if (!family) {
      throw new ApiException({
        code: ApiErrorCode.NOT_FOUND,
        message: "No family exists",
        status: 404,
      });
    }

    const memberIndex = family.members.findIndex((m) => m.id === id);
    if (memberIndex === -1) {
      throw new ApiException({
        code: ApiErrorCode.NOT_FOUND,
        message: `Member with id "${id}" not found`,
        status: 404,
      });
    }

    // Don't allow removing the last member
    if (family.members.length <= 1) {
      throw new ApiException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Cannot remove the last family member",
        status: 400,
      });
    }

    const updatedFamily: FamilyData = {
      ...family,
      members: family.members.filter((m) => m.id !== id),
    };

    saveFamilyToStorage(updatedFamily);
  },

  /**
   * Delete the entire family (reset).
   */
  async deleteFamily(): Promise<void> {
    await simulateApiCall({ delayMin: 150, delayMax: 350 });
    saveFamilyToStorage(null);
  },

  // ============================================================================
  // Utility Methods (for testing)
  // ============================================================================

  /**
   * Reset to no family state (useful for testing).
   */
  resetMockData(): void {
    saveFamilyToStorage(null);
  },
};
