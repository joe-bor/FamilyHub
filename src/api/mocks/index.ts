export { calendarMockHandlers } from "./calendar.mock";
export {
  delay,
  maybeFailWithNetworkError,
  maybeFailWithServerError,
  simulateApiCall,
} from "./delay";

// Environment toggle for mock API
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";
