/**
 * Available colors for family members.
 */
export type FamilyColor =
  | "coral"
  | "teal"
  | "green"
  | "purple"
  | "yellow"
  | "pink"
  | "orange";

/**
 * A family member with name, color, and optional avatar.
 */
export interface FamilyMember {
  id: string;
  name: string;
  color: FamilyColor;
  avatarUrl?: string;
  email?: string;
}

/**
 * Family data stored in localStorage.
 */
export interface FamilyData {
  id: string;
  name: string;
  members: FamilyMember[];
  createdAt: string;
  setupComplete: boolean;
}

/**
 * Get a family member by ID from an array.
 * @param members - The array of family members
 * @param id - The family member ID
 * @returns The family member or undefined if not found
 */
export function getFamilyMember(
  members: FamilyMember[],
  id: string,
): FamilyMember | undefined {
  return members.find((m) => m.id === id);
}

/**
 * Color map for family member styling.
 * Maps color name to bg, text, and light variants.
 */
export const colorMap: Record<
  FamilyColor,
  { bg: string; text: string; light: string }
> = {
  coral: {
    bg: "bg-[#e88470]",
    text: "text-[#8b3d32]",
    light: "bg-[#fbe9e6]",
  },
  teal: {
    bg: "bg-[#5cb8b2]",
    text: "text-[#2d6360]",
    light: "bg-[#e0f4f3]",
  },
  pink: {
    bg: "bg-[#e896b8]",
    text: "text-[#8b4660]",
    light: "bg-[#fce8f0]",
  },
  green: {
    bg: "bg-[#7bc67b]",
    text: "text-[#3d6b3d]",
    light: "bg-[#e6f5e6]",
  },
  purple: {
    bg: "bg-[#9b7bcf]",
    text: "text-[#523d70]",
    light: "bg-[#ede6f7]",
  },
  yellow: {
    bg: "bg-[#f5c842]",
    text: "text-[#7a5f10]",
    light: "bg-[#fef6dc]",
  },
  orange: {
    bg: "bg-[#f5a442]",
    text: "text-[#7a4f10]",
    light: "bg-[#fef0dc]",
  },
};

/**
 * List of all available family colors.
 */
export const familyColors: FamilyColor[] = [
  "coral",
  "teal",
  "green",
  "purple",
  "yellow",
  "pink",
  "orange",
];

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to create a new family (during onboarding).
 */
export interface CreateFamilyRequest {
  name: string;
  members: Array<Omit<FamilyMember, "id">>;
}

/**
 * Request to update family properties.
 */
export interface UpdateFamilyRequest {
  name?: string;
}

/**
 * Request to add a new member to the family.
 */
export interface AddMemberRequest {
  name: string;
  color: FamilyColor;
  avatarUrl?: string;
  email?: string;
}

/**
 * Request to update an existing member.
 */
export interface UpdateMemberRequest {
  id: string;
  name?: string;
  color?: FamilyColor;
  avatarUrl?: string;
  email?: string;
}

// Re-export unified response type
export type { ApiResponse } from "./api-response";

// Type aliases using unified ApiResponse
import type { ApiResponse } from "./api-response";

/**
 * API response wrapper for family data.
 * Returns null when no family exists (triggers onboarding).
 */
export type FamilyApiResponse = ApiResponse<FamilyData | null>;

/**
 * Mutation response for family operations.
 */
export type FamilyMutationResponse = ApiResponse<FamilyData>;

/**
 * Mutation response for member operations.
 */
export type MemberMutationResponse = ApiResponse<FamilyMember>;
