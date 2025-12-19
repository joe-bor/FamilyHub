// Client
export { ApiErrorCode, ApiException, httpClient, type ApiErrorDetails } from "./client"

// Services
export { calendarService } from "./services"

// Hooks
export {
  calendarKeys,
  useCalendarEvents,
  useCalendarEvent,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from "./hooks"

// Mocks
export { USE_MOCK_API } from "./mocks"
