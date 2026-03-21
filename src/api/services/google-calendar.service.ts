import { httpClient } from "@/api/client";
import type {
  ApiResponse,
  GoogleAuthUrl,
  GoogleCalendarInfo,
  GoogleConnectionStatus,
} from "@/lib/types";

export const googleCalendarService = {
  async getAuthUrl(memberId: string): Promise<ApiResponse<GoogleAuthUrl>> {
    return httpClient.get<ApiResponse<GoogleAuthUrl>>("/google/auth", {
      params: { memberId },
    });
  },

  async getConnectionStatus(
    memberId: string,
  ): Promise<ApiResponse<GoogleConnectionStatus>> {
    return httpClient.get<ApiResponse<GoogleConnectionStatus>>(
      `/google/status/${memberId}`,
    );
  },

  async getCalendars(
    memberId: string,
  ): Promise<ApiResponse<GoogleCalendarInfo[]>> {
    return httpClient.get<ApiResponse<GoogleCalendarInfo[]>>(
      `/google/calendars/${memberId}`,
    );
  },

  async updateCalendars(
    memberId: string,
    calendarIds: string[],
  ): Promise<ApiResponse<GoogleCalendarInfo[]>> {
    return httpClient.put<ApiResponse<GoogleCalendarInfo[]>>(
      `/google/calendars/${memberId}`,
      { calendarIds },
    );
  },

  async syncCalendar(memberId: string): Promise<void> {
    return httpClient.post(`/google/sync/${memberId}`);
  },

  async disconnect(memberId: string): Promise<void> {
    return httpClient.delete(`/google/disconnect/${memberId}`);
  },
};
