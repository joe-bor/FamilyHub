export { authMockHandlers } from "./auth.mock";
export { calendarMockHandlers } from "./calendar.mock";
export {
  delay,
  maybeFailWithNetworkError,
  maybeFailWithServerError,
  simulateApiCall,
} from "./delay";
export { familyMockHandlers } from "./family.mock";

// Environment toggle for mock API
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";
