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
  { bg: string; text: string; light: string; hex: string }
> = {
  coral: {
    bg: "bg-[#b95443]",
    text: "text-[#8b3d32]",
    light: "bg-[#fbe9e6]",
    hex: "#b95443",
  },
  teal: {
    bg: "bg-[#2f827f]",
    text: "text-[#2d6360]",
    light: "bg-[#e0f4f3]",
    hex: "#2f827f",
  },
  pink: {
    bg: "bg-[#aa4d77]",
    text: "text-[#8b4660]",
    light: "bg-[#fce8f0]",
    hex: "#aa4d77",
  },
  green: {
    bg: "bg-[#467c4b]",
    text: "text-[#3d6b3d]",
    light: "bg-[#e6f5e6]",
    hex: "#467c4b",
  },
  purple: {
    bg: "bg-[#7052ad]",
    text: "text-[#523d70]",
    light: "bg-[#ede6f7]",
    hex: "#7052ad",
  },
  yellow: {
    bg: "bg-[#8f6a16]",
    text: "text-[#7a5f10]",
    light: "bg-[#fef6dc]",
    hex: "#8f6a16",
  },
  orange: {
    bg: "bg-[#ad6429]",
    text: "text-[#7a4f10]",
    light: "bg-[#fef0dc]",
    hex: "#ad6429",
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
 * Request to update family properties.
 */
export interface UpdateFamilyRequest {
  name: string;
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
  name: string;
  color: FamilyColor;
  avatarUrl?: string | null;
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
