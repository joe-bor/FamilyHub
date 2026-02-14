import type { UseQueryOptions } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ApiException } from "@/api/client";
import { familyService } from "@/api/services";
import { FAMILY_STORAGE_KEY } from "@/lib/constants";
import type {
  AddMemberRequest,
  CreateFamilyRequest,
  FamilyApiResponse,
  FamilyColor,
  FamilyData,
  FamilyMember,
  FamilyMutationResponse,
  MemberMutationResponse,
  UpdateFamilyRequest,
  UpdateMemberRequest,
} from "@/lib/types";
import { familyColors } from "@/lib/types";

// ============================================================================
// Query Keys Factory
// ============================================================================

export const familyKeys = {
  all: ["family"] as const,
  family: () => [...familyKeys.all, "data"] as const,
};

// ============================================================================
// localStorage Helpers
// ============================================================================

/**
 * Write family data to localStorage for:
 * 1. Instant startup on next page load (cache seeding)
 * 2. Cross-tab sync via storage events
 */
function writeFamilyToStorage(family: FamilyData | null): void {
  try {
    if (family === null) {
      localStorage.removeItem(FAMILY_STORAGE_KEY);
    } else {
      // Match Zustand persist format for compatibility
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
      console.error("Failed to write family to localStorage:", error);
    }
  }
}

/**
 * Read family data from localStorage for cache seeding.
 */
export function readFamilyFromStorage(): FamilyData | null {
  try {
    const stored = localStorage.getItem(FAMILY_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return parsed?.state?.family ?? null;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to read family from localStorage:", error);
    }
    return null;
  }
}

// ============================================================================
// Main Query
// ============================================================================

/**
 * Fetch family data with localStorage seeding for instant startup.
 */
export function useFamily(
  options?: Omit<
    UseQueryOptions<FamilyApiResponse, ApiException>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: familyKeys.family(),
    queryFn: familyService.getFamily,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Seed from localStorage for instant startup
    initialData: () => {
      const cached = readFamilyFromStorage();
      if (cached) {
        return { data: cached };
      }
      return undefined;
    },
    // Mark initialData as potentially stale to trigger background refetch
    initialDataUpdatedAt: 0,
    ...options,
  });
}

// ============================================================================
// Derived Selectors (read from query cache)
// ============================================================================

/**
 * Get family data (null if not initialized).
 */
export function useFamilyData(): FamilyData | null {
  const { data } = useFamily();
  return data?.data ?? null;
}

/**
 * Get all family members.
 */
export function useFamilyMembers(): FamilyMember[] {
  const { data } = useFamily();
  return data?.data?.members ?? [];
}

/**
 * Get family name.
 */
export function useFamilyName(): string {
  const { data } = useFamily();
  return data?.data?.name ?? "";
}

/**
 * Check if setup is complete.
 */
export function useSetupComplete(): boolean {
  const { data, isFetched } = useFamily();
  // Only return true if we've fetched and have a family with setupComplete
  if (!isFetched) return false;
  return data?.data?.setupComplete ?? false;
}

/**
 * Check if family data is loading (for initial load states).
 */
export function useFamilyLoading(): boolean {
  const { isLoading, isFetching, data } = useFamily();
  // Loading if we don't have data and are fetching
  return isLoading || (isFetching && !data);
}

/**
 * Get a family member by ID.
 */
export function useFamilyMemberById(id: string): FamilyMember | undefined {
  const members = useFamilyMembers();
  return members.find((m) => m.id === id);
}

/**
 * Get the family member map for O(1) lookups.
 * Memoized to prevent creating new Map on every render.
 */
export function useFamilyMemberMap(): Map<string, FamilyMember> {
  const members = useFamilyMembers();
  return useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
}

/**
 * Get unused colors (colors not assigned to any member).
 * Memoized to prevent creating new array on every render.
 */
export function useUnusedColors(): FamilyColor[] {
  const members = useFamilyMembers();
  return useMemo(() => {
    const usedColors = new Set(members.map((m) => m.color));
    return familyColors.filter((c) => !usedColors.has(c));
  }, [members]);
}

// ============================================================================
// Mutations
// ============================================================================

interface CreateFamilyCallbacks {
  onSuccess?: (data: FamilyMutationResponse) => void;
  onError?: (error: ApiException) => void;
}

/**
 * Create a new family (during onboarding).
 */
export function useCreateFamily(callbacks?: CreateFamilyCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateFamilyRequest) =>
      familyService.createFamily(request),
    onSuccess: (response) => {
      // Update query cache
      queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
        data: response.data,
      });
      // Write-through to localStorage
      writeFamilyToStorage(response.data);
      callbacks?.onSuccess?.(response);
    },
    onError: (error: ApiException) => {
      callbacks?.onError?.(error);
    },
  });
}

interface UpdateFamilyCallbacks {
  onSuccess?: (data: FamilyMutationResponse) => void;
  onError?: (error: ApiException) => void;
}

/**
 * Update family properties (e.g., name).
 */
export function useUpdateFamily(callbacks?: UpdateFamilyCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateFamilyRequest) =>
      familyService.updateFamily(request),
    // Optimistic update
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: familyKeys.family() });

      const previousData = queryClient.getQueryData<FamilyApiResponse>(
        familyKeys.family(),
      );

      if (previousData?.data) {
        const optimisticFamily: FamilyData = {
          ...previousData.data,
          name: request.name,
        };
        queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
          ...previousData,
          data: optimisticFamily,
        });
      }

      return { previousData };
    },
    onError: (error: ApiException, _request, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(familyKeys.family(), context.previousData);
      }
      callbacks?.onError?.(error);
    },
    onSuccess: (response) => {
      // Update with server response
      queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
        data: response.data,
      });
      // Write-through to localStorage
      writeFamilyToStorage(response.data);
      callbacks?.onSuccess?.(response);
    },
  });
}

interface AddMemberCallbacks {
  onSuccess?: (data: MemberMutationResponse) => void;
  onError?: (error: ApiException) => void;
}

/**
 * Add a new member to the family.
 */
export function useAddMember(callbacks?: AddMemberCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AddMemberRequest) => familyService.addMember(request),
    // Optimistic update
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: familyKeys.family() });

      const previousData = queryClient.getQueryData<FamilyApiResponse>(
        familyKeys.family(),
      );

      if (previousData?.data) {
        const optimisticMember: FamilyMember = {
          id: `temp-${Date.now()}`, // Temporary ID, replaced on success
          ...request,
        };
        const optimisticFamily: FamilyData = {
          ...previousData.data,
          members: [...previousData.data.members, optimisticMember],
        };
        queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
          ...previousData,
          data: optimisticFamily,
        });
      }

      return { previousData };
    },
    onError: (error: ApiException, _request, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(familyKeys.family(), context.previousData);
      }
      callbacks?.onError?.(error);
    },
    onSuccess: (response) => {
      // Replace temp member with server response (which has real ID)
      const currentData = queryClient.getQueryData<FamilyApiResponse>(
        familyKeys.family(),
      );
      if (currentData?.data) {
        const updatedFamily: FamilyData = {
          ...currentData.data,
          members: currentData.data.members.map((m) =>
            m.id.startsWith("temp-") ? response.data : m,
          ),
        };
        queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
          ...currentData,
          data: updatedFamily,
        });
        // Write-through to localStorage
        writeFamilyToStorage(updatedFamily);
      }
      callbacks?.onSuccess?.(response);
    },
  });
}

interface UpdateMemberCallbacks {
  onSuccess?: (data: MemberMutationResponse) => void;
  onError?: (error: ApiException) => void;
}

/**
 * Update an existing member.
 */
export function useUpdateMember(callbacks?: UpdateMemberCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateMemberRequest) =>
      familyService.updateMember(request),
    // Optimistic update
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: familyKeys.family() });

      const previousData = queryClient.getQueryData<FamilyApiResponse>(
        familyKeys.family(),
      );

      if (previousData?.data) {
        const optimisticFamily: FamilyData = {
          ...previousData.data,
          members: previousData.data.members.map((m) =>
            m.id === request.id
              ? {
                  ...m,
                  name: request.name,
                  color: request.color,
                  avatarUrl:
                    request.avatarUrl !== undefined
                      ? (request.avatarUrl ?? undefined)
                      : m.avatarUrl,
                  email: request.email !== undefined ? request.email : m.email,
                }
              : m,
          ),
        };
        queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
          ...previousData,
          data: optimisticFamily,
        });
      }

      return { previousData };
    },
    onError: (error: ApiException, _request, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(familyKeys.family(), context.previousData);
      }
      callbacks?.onError?.(error);
    },
    onSuccess: (response, request) => {
      // Update the specific member with server response
      const currentData = queryClient.getQueryData<FamilyApiResponse>(
        familyKeys.family(),
      );
      if (currentData?.data) {
        const updatedFamily: FamilyData = {
          ...currentData.data,
          members: currentData.data.members.map((m) =>
            m.id === request.id ? response.data : m,
          ),
        };
        queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
          ...currentData,
          data: updatedFamily,
        });
        // Write-through to localStorage
        writeFamilyToStorage(updatedFamily);
      }
      callbacks?.onSuccess?.(response);
    },
  });
}

interface RemoveMemberCallbacks {
  onSuccess?: () => void;
  onError?: (error: ApiException) => void;
}

/**
 * Remove a member from the family.
 */
export function useRemoveMember(callbacks?: RemoveMemberCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => familyService.removeMember(id),
    // Optimistic delete
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey: familyKeys.family() });

      const previousData = queryClient.getQueryData<FamilyApiResponse>(
        familyKeys.family(),
      );

      if (previousData?.data) {
        const optimisticFamily: FamilyData = {
          ...previousData.data,
          members: previousData.data.members.filter((m) => m.id !== memberId),
        };
        queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
          ...previousData,
          data: optimisticFamily,
        });
      }

      return { previousData };
    },
    onError: (error: ApiException, _memberId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(familyKeys.family(), context.previousData);
      }
      callbacks?.onError?.(error);
    },
    onSuccess: () => {
      // Get current data and write to localStorage
      const currentData = queryClient.getQueryData<FamilyApiResponse>(
        familyKeys.family(),
      );
      if (currentData?.data) {
        writeFamilyToStorage(currentData.data);
      }
      callbacks?.onSuccess?.();
    },
  });
}

interface DeleteFamilyCallbacks {
  onSuccess?: () => void;
  onError?: (error: ApiException) => void;
}

/**
 * Delete the entire family (reset).
 */
export function useDeleteFamily(callbacks?: DeleteFamilyCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => familyService.deleteFamily(),
    onSuccess: () => {
      // Clear query cache
      queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
        data: null,
      });
      // Clear localStorage
      writeFamilyToStorage(null);
      callbacks?.onSuccess?.();
    },
    onError: (error: ApiException) => {
      callbacks?.onError?.(error);
    },
  });
}

// ============================================================================
// Cross-Tab Sync Helper
// ============================================================================

/**
 * Sync family data from localStorage to query cache.
 * Called by the storage event listener in family-store.ts.
 */
export function syncFamilyFromStorage(
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  const family = readFamilyFromStorage();
  queryClient.setQueryData<FamilyApiResponse>(familyKeys.family(), {
    data: family,
  });
}
