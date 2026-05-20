import { httpClient } from "@/api/client";
import type {
  ApiResponse,
  ChoreCurrentPeriodState,
  ChoresBoard,
  ChoreTemplate,
  CreateChoreTemplateRequest,
  UpdateChoreTemplateRequest,
  UpdateCurrentPeriodCompletionRequest,
} from "@/lib/types";

export const choreService = {
  async getBoard(): Promise<ApiResponse<ChoresBoard>> {
    return httpClient.get<ApiResponse<ChoresBoard>>("/chores/board");
  },

  async createTemplate(
    request: CreateChoreTemplateRequest,
  ): Promise<ApiResponse<ChoreTemplate>> {
    return httpClient.post<ApiResponse<ChoreTemplate>>(
      "/chores/templates",
      request,
    );
  },

  async updateTemplate(
    id: string,
    request: UpdateChoreTemplateRequest,
  ): Promise<ApiResponse<ChoreTemplate>> {
    return httpClient.patch<ApiResponse<ChoreTemplate>>(
      `/chores/templates/${id}`,
      request,
    );
  },

  async completeCurrentPeriod(
    id: string,
    request: UpdateCurrentPeriodCompletionRequest,
  ): Promise<ApiResponse<ChoreCurrentPeriodState>> {
    return httpClient.put<ApiResponse<ChoreCurrentPeriodState>>(
      `/chores/templates/${id}/current-period-completion`,
      request,
    );
  },

  async uncompleteCurrentPeriod(
    id: string,
    request: UpdateCurrentPeriodCompletionRequest,
  ): Promise<ApiResponse<ChoreCurrentPeriodState>> {
    return httpClient.delete<ApiResponse<ChoreCurrentPeriodState>>(
      `/chores/templates/${id}/current-period-completion`,
      request,
    );
  },
};
