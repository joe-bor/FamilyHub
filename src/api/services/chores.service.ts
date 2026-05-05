import { httpClient } from "@/api/client";
import type {
  ApiResponse,
  Chore,
  CreateChoreRequest,
  UpdateChoreRequest,
} from "@/lib/types";

export const choreService = {
  async getChores(): Promise<ApiResponse<Chore[]>> {
    return httpClient.get<ApiResponse<Chore[]>>("/chores");
  },

  async createChore(request: CreateChoreRequest): Promise<ApiResponse<Chore>> {
    return httpClient.post<ApiResponse<Chore>>("/chores", request);
  },

  async updateChore(
    id: string,
    request: UpdateChoreRequest,
  ): Promise<ApiResponse<Chore>> {
    return httpClient.patch<ApiResponse<Chore>>(`/chores/${id}`, request);
  },

  async deleteChore(id: string): Promise<void> {
    return httpClient.delete(`/chores/${id}`);
  },
};
