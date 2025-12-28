import type { FamilyColor, FamilyData, FamilyMember } from "@/lib/types";

/**
 * Test family members with different colors.
 */
export const testMembers: FamilyMember[] = [
  { id: "member-1", name: "John", color: "coral" as FamilyColor },
  { id: "member-2", name: "Jane", color: "teal" as FamilyColor },
  { id: "member-3", name: "Alex", color: "green" as FamilyColor },
];

/**
 * Single test member for simpler tests.
 */
export const testMember: FamilyMember = testMembers[0];

/**
 * Complete test family data (setup complete).
 */
export const testFamily: FamilyData = {
  id: "family-1",
  name: "Test Family",
  members: testMembers,
  createdAt: "2025-01-01T00:00:00.000Z",
  setupComplete: true,
};

/**
 * Incomplete family data (onboarding not finished).
 */
export const incompleteFamily: FamilyData = {
  id: "family-2",
  name: "Incomplete Family",
  members: [],
  createdAt: "2025-01-01T00:00:00.000Z",
  setupComplete: false,
};

/**
 * Create a custom test member with overrides.
 */
export function createTestMember(
  overrides: Partial<FamilyMember> = {},
): FamilyMember {
  return {
    id: `member-${Date.now()}`,
    name: "Test Member",
    color: "coral" as FamilyColor,
    ...overrides,
  };
}

/**
 * Create a family with custom members.
 */
export function createTestFamily(
  members: FamilyMember[],
  overrides: Partial<Omit<FamilyData, "members">> = {},
): FamilyData {
  return {
    id: `family-${Date.now()}`,
    name: "Test Family",
    createdAt: new Date().toISOString(),
    setupComplete: true,
    ...overrides,
    members,
  };
}
