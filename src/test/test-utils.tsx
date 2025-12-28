import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";

/**
 * Creates a fresh QueryClient for each test with testing-optimized defaults
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Wrapper component that includes all providers needed for testing
 */
function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient ?? createTestQueryClient();

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

/**
 * Custom render function that wraps components with all necessary providers.
 *
 * @example
 * // Basic usage
 * const { getByText } = render(<MyComponent />);
 *
 * @example
 * // With custom QueryClient
 * const queryClient = createTestQueryClient();
 * const { getByText } = render(<MyComponent />, { queryClient });
 */
function customRender(
  ui: ReactElement,
  { queryClient, ...options }: CustomRenderOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient}>{children}</AllProviders>
    ),
    ...options,
  });
}

/**
 * Sets up userEvent with the rendered component.
 *
 * @example
 * const { user, getByRole } = renderWithUser(<MyButton />);
 * await user.click(getByRole('button'));
 */
function renderWithUser(ui: ReactElement, options?: CustomRenderOptions) {
  return {
    user: userEvent.setup(),
    ...customRender(ui, options),
  };
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { userEvent };

// Export custom utilities
export { customRender as render, renderWithUser, createTestQueryClient };
