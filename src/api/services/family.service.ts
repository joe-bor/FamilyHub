import { httpClient } from "@/api/client";
import { familyMockHandlers, USE_MOCK_API } from "@/api/mocks";
import type {
  AddMemberRequest,
  CreateFamilyRequest,
  FamilyApiResponse,
  FamilyMutationResponse,
  MemberMutationResponse,
  UpdateFamilyRequest,
  UpdateMemberRequest,
} from "@/lib/types";

export const familyService = {
  /**
   * Get the current family data.
   * Returns null in data field if no family exists (triggers onboarding).
   */
  async getFamily(): Promise<FamilyApiResponse> {
    if (USE_MOCK_API) {
      return familyMockHandlers.getFamily();
    }
    return httpClient.get<FamilyApiResponse>("/family");
  },

  /**
   * Create a new family (during onboarding).
   */
  async createFamily(
    request: CreateFamilyRequest,
  ): Promise<FamilyMutationResponse> {
    if (USE_MOCK_API) {
      return familyMockHandlers.createFamily(request);
    }
    return httpClient.post<FamilyMutationResponse>("/family", request);
  },

  /**
   * Update family properties (e.g., name).
   */
  async updateFamily(
    request: UpdateFamilyRequest,
  ): Promise<FamilyMutationResponse> {
    if (USE_MOCK_API) {
      return familyMockHandlers.updateFamily(request);
    }
    return httpClient.put<FamilyMutationResponse>("/family", request);
  },

  /**
   * Add a new member to the family.
   */
  async addMember(request: AddMemberRequest): Promise<MemberMutationResponse> {
    if (USE_MOCK_API) {
      return familyMockHandlers.addMember(request);
    }
    return httpClient.post<MemberMutationResponse>("/family/members", request);
  },

  /**
   * Update an existing member.
   */
  async updateMember(
    request: UpdateMemberRequest,
  ): Promise<MemberMutationResponse> {
    if (USE_MOCK_API) {
      return familyMockHandlers.updateMember(request);
    }
    return httpClient.put<MemberMutationResponse>(
      `/family/members/${request.id}`,
      request,
    );
  },

  /**
   * Remove a member from the family.
   */
  async removeMember(id: string): Promise<void> {
    if (USE_MOCK_API) {
      return familyMockHandlers.removeMember(id);
    }
    return httpClient.delete(`/family/members/${id}`);
  },

  /**
   * Delete the entire family (reset).
   */
  async deleteFamily(): Promise<void> {
    if (USE_MOCK_API) {
      return familyMockHandlers.deleteFamily();
    }
    return httpClient.delete("/family");
  },
};
