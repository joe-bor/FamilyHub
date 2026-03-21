# Google Calendar FE Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add frontend support for read-only Google Calendar integration — types, API layer, OAuth flow, member profile connection UI, event display changes, and description field.

**Architecture:** New `google-calendar.service.ts` + `use-google-calendar.ts` handle Google-specific API calls (OAuth, sync, disconnect). Existing calendar hooks stay untouched — the BE already mixes Google events into the regular events endpoint. UI changes are localized to existing components (member profile, event cards, event detail modal, event form).

**Tech Stack:** React 19, TypeScript, TanStack Query, Zustand, react-hook-form, Zod, Radix UI, Tailwind CSS v4, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-03-20-google-calendar-fe-integration.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/types/google-calendar.ts` | Google Calendar types (`GoogleCalendarInfo`, `GoogleConnectionStatus`, `GoogleAuthUrl`) |
| `src/api/services/google-calendar.service.ts` | HTTP calls to `/api/google/*` endpoints |
| `src/api/hooks/use-google-calendar.ts` | TanStack Query hooks for Google connection management |
| `src/components/settings/google-calendar-section.tsx` | Google Calendar section in member profile (3 states: disconnected/connected/syncing) |
| `src/components/settings/google-calendar-picker-modal.tsx` | Modal with checkboxes for selecting which Google calendars to sync |
| `src/hooks/use-google-auth-return.ts` | OAuth return detection + state restoration on app mount |
| `src/components/ui/toast.tsx` | Toast notification component (Radix `@radix-ui/react-toast` already installed) |
| `src/components/ui/toaster.tsx` | Toaster provider + `useToast` hook |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/types/calendar.ts` | Add `source`, `description`, `htmlLink` to `CalendarEvent` + `description` to request types |
| `src/lib/types/index.ts` | Add barrel export for `google-calendar` |
| `src/lib/validations/calendar.ts` | Add `description` to Zod schema |
| `src/api/services/index.ts` | Add barrel export for `googleCalendarService` |
| `src/api/hooks/index.ts` | Add barrel exports for Google Calendar hooks |
| `src/api/index.ts` | Add barrel exports for Google Calendar hooks + service |
| `src/components/calendar/components/calendar-event.tsx` | Add Google "G" icon overlay |
| `src/components/calendar/components/event-detail-modal.tsx` | Add description, "Open in Google Calendar" link, edit/delete guard toast |
| `src/components/calendar/components/mobile-event-detail.tsx` | Same as above for mobile |
| `src/components/calendar/components/event-form.tsx` | Add collapsible description textarea |
| `src/components/calendar/calendar-module.tsx` | Add Google event guard before edit/delete |
| `src/components/settings/member-profile-modal.tsx` | Add `GoogleCalendarSection`, remove "coming soon" text |
| `src/App.tsx` | Add `useGoogleAuthReturn()` hook + `<Toaster />` |

---

## Task 1: Toast Component (dependency for later tasks)

The app needs toast notifications for the Google event guard and OAuth return feedback. `@radix-ui/react-toast` is already installed but no component exists.

**Files:**
- Create: `src/components/ui/toast.tsx`
- Create: `src/components/ui/toaster.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the toast component using shadcn/ui pattern**

```typescript
// src/components/ui/toast.tsx
import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const Toast = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & {
    variant?: "default" | "destructive";
  }
>(({ className, variant = "default", ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn(
      "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 shadow-lg transition-all",
      "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
      variant === "destructive"
        ? "border-destructive bg-destructive text-destructive-foreground"
        : "border-border bg-background text-foreground",
      className,
    )}
    {...props}
  />
));
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium",
      "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
      "group-[.destructive]:border-destructive/30 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
      "group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
};

export type ToastActionElement = React.ReactElement<typeof ToastAction>;
```

- [ ] **Step 2: Create the toaster hook and provider**

```typescript
// src/components/ui/toaster.tsx
import { useEffect, useState } from "react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastActionElement,
} from "@/components/ui/toast";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 5000;

type ToastData = {
  id: string;
  title?: string;
  description?: string;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  open: boolean;
};

let toastCount = 0;
const listeners: Array<(toasts: ToastData[]) => void> = [];
let memoryToasts: ToastData[] = [];

function genId() {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER;
  return toastCount.toString();
}

function dispatch(toasts: ToastData[]) {
  memoryToasts = toasts;
  listeners.forEach((listener) => listener(toasts));
}

export function toast({
  title,
  description,
  action,
  variant,
}: Omit<ToastData, "id" | "open">) {
  const id = genId();
  const newToast: ToastData = { id, title, description, action, variant, open: true };

  dispatch([newToast, ...memoryToasts].slice(0, TOAST_LIMIT));

  setTimeout(() => {
    dispatch(memoryToasts.map((t) => (t.id === id ? { ...t, open: false } : t)));
  }, TOAST_REMOVE_DELAY);

  return id;
}

function useToastState() {
  const [toasts, setToasts] = useState<ToastData[]>(memoryToasts);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      const index = listeners.indexOf(setToasts);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return toasts;
}

export function Toaster() {
  const toasts = useToastState();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, open }) => (
        <Toast key={id} open={open} variant={variant}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
```

- [ ] **Step 3: Add Toaster to App.tsx**

In `src/App.tsx`, import `{ Toaster }` from `@/components/ui/toaster` and add `<Toaster />` as the last child inside the root fragment or after the main layout div — it renders a portal so placement doesn't matter structurally, but it must be inside the component tree.

```typescript
// Add import
import { Toaster } from "@/components/ui/toaster";

// In the return of FamilyHub component, add after closing </div>:
// Before the final return's closing fragment or as sibling to the layout div:
<Toaster />
```

The `<Toaster />` should be rendered in ALL states (authenticated and unauthenticated) since OAuth return toasts fire before full auth check. Place it outside the auth conditionals, right before the function's closing.

- [ ] **Step 4: Verify toast works manually**

Run: `npm run dev`

In browser console, test: Import toast and fire a test notification to verify the setup works. Then remove the test code.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/toast.tsx src/components/ui/toaster.tsx src/App.tsx
git commit -m "feat(ui): add toast notification component using Radix Toast"
```

---

## Task 2: Type Changes

**Files:**
- Modify: `src/lib/types/calendar.ts`
- Create: `src/lib/types/google-calendar.ts`
- Modify: `src/lib/types/index.ts`
- Modify: `src/lib/validations/calendar.ts`

- [ ] **Step 1: Extend CalendarEvent type**

In `src/lib/types/calendar.ts`, add three optional fields to the `CalendarEvent` interface:

```typescript
export interface CalendarEvent {
  id: string | null;
  title: string;
  startTime: string;
  endTime: string;
  date: Date;
  endDate?: Date;
  memberId: string;
  isAllDay: boolean;
  location?: string;
  recurrenceRule?: string;
  recurringEventId?: string;
  isRecurring?: boolean;
  // Google Calendar integration
  source?: "NATIVE" | "GOOGLE";
  description?: string;
  htmlLink?: string;
}
```

Add `description` to both request types:

```typescript
export interface CreateEventRequest {
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  endDate?: string | null;
  memberId: string;
  isAllDay?: boolean;
  location?: string;
  recurrenceRule?: string | null;
  description?: string;
}

export interface UpdateEventRequest {
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  endDate?: string | null;
  memberId: string;
  isAllDay?: boolean;
  location?: string;
  recurrenceRule?: string | null;
  description?: string;
}
```

- [ ] **Step 2: Create google-calendar.ts types**

```typescript
// src/lib/types/google-calendar.ts

export interface GoogleAuthUrl {
  url: string;
}

export interface GoogleCalendarInfo {
  id: string;
  name: string;
  primary: boolean;
  enabled: boolean;
}

export interface GoogleConnectionStatus {
  connected: boolean;
  calendars: Array<{
    id: string;
    name: string;
    enabled: boolean;
    lastSyncedAt: string | null;
  }>;
}
```

- [ ] **Step 3: Update barrel exports**

In `src/lib/types/index.ts`, add:

```typescript
export * from "./google-calendar";
```

- [ ] **Step 4: Add description to Zod schema**

In `src/lib/validations/calendar.ts`, add `description` to the `.object({})` block, after the `location` field:

```typescript
    description: z
      .string()
      .max(2000, "Description must be 2000 characters or less")
      .optional(),
```

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors — all new fields are optional so existing code compiles.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/calendar.ts src/lib/types/google-calendar.ts src/lib/types/index.ts src/lib/validations/calendar.ts
git commit -m "feat(types): add Google Calendar types and description field"
```

---

## Task 3: Google Calendar API Service

**Files:**
- Create: `src/api/services/google-calendar.service.ts`
- Modify: `src/api/services/index.ts`

- [ ] **Step 1: Write the service tests**

Create `src/api/services/google-calendar.service.test.ts` to verify each service method makes the correct HTTP call. Use MSW to mock API responses.

```typescript
// src/api/services/google-calendar.service.test.ts
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { googleCalendarService } from "./google-calendar.service";

const MEMBER_ID = "member-123";

describe("googleCalendarService", () => {
  describe("getAuthUrl", () => {
    it("returns the OAuth redirect URL", async () => {
      server.use(
        http.get("*/google/auth", () =>
          HttpResponse.json({
            data: { url: "https://accounts.google.com/o/oauth2/v2/auth?..." },
            message: null,
          }),
        ),
      );

      const result = await googleCalendarService.getAuthUrl(MEMBER_ID);
      expect(result.data.url).toContain("accounts.google.com");
    });
  });

  describe("getConnectionStatus", () => {
    it("returns connection status for a member", async () => {
      server.use(
        http.get(`*/google/status/${MEMBER_ID}`, () =>
          HttpResponse.json({
            data: { connected: true, calendars: [] },
            message: null,
          }),
        ),
      );

      const result = await googleCalendarService.getConnectionStatus(MEMBER_ID);
      expect(result.data.connected).toBe(true);
    });
  });

  describe("disconnect", () => {
    it("calls DELETE endpoint", async () => {
      server.use(
        http.delete(`*/google/disconnect/${MEMBER_ID}`, () =>
          new HttpResponse(null, { status: 204 }),
        ),
      );

      await expect(
        googleCalendarService.disconnect(MEMBER_ID),
      ).resolves.not.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/api/services/google-calendar.service.test.ts`
Expected: FAIL — `googleCalendarService` not found.

- [ ] **Step 3: Create the service**

```typescript
// src/api/services/google-calendar.service.ts
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
```

- [ ] **Step 4: Update barrel export**

In `src/api/services/index.ts`, add:

```typescript
export { googleCalendarService } from "./google-calendar.service";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/api/services/google-calendar.service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/api/services/google-calendar.service.ts src/api/services/google-calendar.service.test.ts src/api/services/index.ts
git commit -m "feat(api): add Google Calendar service layer"
```

---

## Task 4: Google Calendar TanStack Query Hooks

**Files:**
- Create: `src/api/hooks/use-google-calendar.ts`
- Modify: `src/api/hooks/index.ts`
- Modify: `src/api/index.ts`

- [ ] **Step 1: Write hook tests**

Create `src/api/hooks/use-google-calendar.test.tsx`. Test the query hooks return data and mutation hooks invalidate correct keys.

```typescript
// src/api/hooks/use-google-calendar.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { server } from "@/test/mocks/server";
import { calendarKeys } from "./use-calendar";
import {
  googleCalendarKeys,
  useGoogleConnectionStatus,
  useSyncGoogleCalendar,
} from "./use-google-calendar";

const MEMBER_ID = "member-123";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useGoogleConnectionStatus", () => {
  it("fetches connection status for a member", async () => {
    server.use(
      http.get(`*/google/status/${MEMBER_ID}`, () =>
        HttpResponse.json({
          data: { connected: false, calendars: [] },
          message: null,
        }),
      ),
    );

    const { result } = renderHook(
      () => useGoogleConnectionStatus(MEMBER_ID),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.connected).toBe(false);
  });

  it("does not fetch when memberId is empty", () => {
    const { result } = renderHook(
      () => useGoogleConnectionStatus(""),
      { wrapper: createWrapper() },
    );

    expect(result.current.isFetching).toBe(false);
  });
});

describe("useSyncGoogleCalendar", () => {
  it("invalidates status and events on success", async () => {
    server.use(
      http.post(`*/google/sync/${MEMBER_ID}`, () =>
        new HttpResponse(null, { status: 200 }),
      ),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Seed cache
    queryClient.setQueryData(googleCalendarKeys.status(MEMBER_ID), {
      data: { connected: true, calendars: [] },
    });
    queryClient.setQueryData(calendarKeys.events(), { data: [] });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSyncGoogleCalendar(), {
      wrapper,
    });

    result.current.mutate(MEMBER_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify cache was invalidated
    expect(
      queryClient.getQueryState(googleCalendarKeys.status(MEMBER_ID))?.isInvalidated,
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/api/hooks/use-google-calendar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the hooks**

```typescript
// src/api/hooks/use-google-calendar.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiException } from "@/api/client";
import { googleCalendarService } from "@/api/services";
import type {
  ApiResponse,
  GoogleCalendarInfo,
  GoogleConnectionStatus,
} from "@/lib/types";
import { calendarKeys } from "./use-calendar";

export const googleCalendarKeys = {
  all: ["google-calendar"] as const,
  status: (memberId: string) =>
    [...googleCalendarKeys.all, "status", memberId] as const,
  calendars: (memberId: string) =>
    [...googleCalendarKeys.all, "calendars", memberId] as const,
};

// Queries

export function useGoogleConnectionStatus(memberId: string) {
  return useQuery({
    queryKey: googleCalendarKeys.status(memberId),
    queryFn: () => googleCalendarService.getConnectionStatus(memberId),
    enabled: !!memberId,
    staleTime: 30 * 1000, // 30 seconds — status changes infrequently
  });
}

export function useGoogleCalendars(memberId: string, enabled = true) {
  return useQuery({
    queryKey: googleCalendarKeys.calendars(memberId),
    queryFn: () => googleCalendarService.getCalendars(memberId),
    enabled: !!memberId && enabled,
  });
}

// Mutations

interface GoogleMutationCallbacks<T = void> {
  onSuccess?: (data: T) => void;
  onError?: (error: ApiException) => void;
}

export function useUpdateGoogleCalendars(
  callbacks?: GoogleMutationCallbacks<ApiResponse<GoogleCalendarInfo[]>>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      calendarIds,
    }: {
      memberId: string;
      calendarIds: string[];
    }) => googleCalendarService.updateCalendars(memberId, calendarIds),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: googleCalendarKeys.calendars(variables.memberId),
      });
      queryClient.invalidateQueries({
        queryKey: googleCalendarKeys.status(variables.memberId),
      });
      queryClient.invalidateQueries({
        queryKey: calendarKeys.events(),
      });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: ApiException) => {
      callbacks?.onError?.(error);
    },
  });
}

export function useSyncGoogleCalendar(
  callbacks?: GoogleMutationCallbacks,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      googleCalendarService.syncCalendar(memberId),
    onSuccess: (_data, memberId) => {
      queryClient.invalidateQueries({
        queryKey: googleCalendarKeys.status(memberId),
      });
      queryClient.invalidateQueries({
        queryKey: calendarKeys.events(),
      });
      callbacks?.onSuccess?.();
    },
    onError: (error: ApiException) => {
      callbacks?.onError?.(error);
    },
  });
}

export function useDisconnectGoogle(
  callbacks?: GoogleMutationCallbacks,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      googleCalendarService.disconnect(memberId),
    onSuccess: (_data, memberId) => {
      queryClient.invalidateQueries({
        queryKey: googleCalendarKeys.status(memberId),
      });
      queryClient.invalidateQueries({
        queryKey: calendarKeys.events(),
      });
      callbacks?.onSuccess?.();
    },
    onError: (error: ApiException) => {
      callbacks?.onError?.(error);
    },
  });
}
```

- [ ] **Step 4: Update barrel exports**

In `src/api/hooks/index.ts`, add:

```typescript
export {
  googleCalendarKeys,
  useDisconnectGoogle,
  useGoogleCalendars,
  useGoogleConnectionStatus,
  useSyncGoogleCalendar,
  useUpdateGoogleCalendars,
} from "./use-google-calendar";
```

In `src/api/index.ts`, add to the hooks export block:

```typescript
  googleCalendarKeys,
  useDisconnectGoogle,
  useGoogleCalendars,
  useGoogleConnectionStatus,
  useSyncGoogleCalendar,
  useUpdateGoogleCalendars,
```

And to the services export:

```typescript
export { authService, calendarService, familyService, googleCalendarService } from "./services";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/api/hooks/use-google-calendar.test.tsx`
Expected: PASS

- [ ] **Step 6: Run full type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/api/hooks/use-google-calendar.ts src/api/hooks/use-google-calendar.test.tsx src/api/hooks/index.ts src/api/index.ts
git commit -m "feat(api): add Google Calendar TanStack Query hooks"
```

---

## Task 5: Google "G" Icon on Event Cards

**Files:**
- Modify: `src/components/calendar/components/calendar-event.tsx`

- [ ] **Step 1: Write tests for the Google icon**

Create `src/components/calendar/components/calendar-event.test.tsx`:

```typescript
import { render, screen } from "@/test/test-utils";
import type { CalendarEvent } from "@/lib/types";
import { CalendarEventCard } from "./calendar-event";

// Mock useFamilyMembers to return test data
vi.mock("@/api", () => ({
  useFamilyMembers: () => [
    { id: "m1", name: "Alice", color: "coral" as const },
  ],
}));

const baseEvent: CalendarEvent = {
  id: "e1",
  title: "Test Event",
  startTime: "09:00",
  endTime: "10:00",
  date: new Date("2026-01-15"),
  memberId: "m1",
  isAllDay: false,
};

describe("CalendarEventCard", () => {
  it("does not show Google icon for native events", () => {
    render(<CalendarEventCard event={baseEvent} />);
    expect(screen.queryByLabelText("Google Calendar event")).not.toBeInTheDocument();
  });

  it("does not show Google icon when source is NATIVE", () => {
    render(<CalendarEventCard event={{ ...baseEvent, source: "NATIVE" }} />);
    expect(screen.queryByLabelText("Google Calendar event")).not.toBeInTheDocument();
  });

  it("shows Google icon when source is GOOGLE", () => {
    render(<CalendarEventCard event={{ ...baseEvent, source: "GOOGLE" }} />);
    expect(screen.getByLabelText("Google Calendar event")).toBeInTheDocument();
  });

  it("shows Google icon in all variants", () => {
    const googleEvent = { ...baseEvent, source: "GOOGLE" as const };

    const { rerender } = render(<CalendarEventCard event={googleEvent} variant="default" />);
    expect(screen.getByLabelText("Google Calendar event")).toBeInTheDocument();

    rerender(<CalendarEventCard event={googleEvent} variant="large" />);
    expect(screen.getByLabelText("Google Calendar event")).toBeInTheDocument();

    rerender(<CalendarEventCard event={googleEvent} variant="compact" />);
    expect(screen.getByLabelText("Google Calendar event")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/calendar/components/calendar-event.test.tsx`
Expected: FAIL — no element with label "Google Calendar event"

- [ ] **Step 3: Add Google icon to CalendarEventCard**

Create a `GoogleIcon` component inline in `calendar-event.tsx` (a small Google "G" SVG). Add it to each variant when `event.source === "GOOGLE"`.

```typescript
// Add at top of file, after imports:
function GoogleBadge({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-label="Google Calendar event"
      className="inline-flex items-center justify-center rounded-full bg-white/70 shadow-sm"
      style={{ width: size + 6, height: size + 6 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    </span>
  );
}

const isGoogleEvent = (event: CalendarEvent) => event.source === "GOOGLE";
```

For each variant, add the badge:

**Default variant** — add after the existing member dot in the top-right area (line ~123-130 area):

```typescript
// In the default variant's right-side icons area, add:
{isGoogleEvent(event) && <GoogleBadge size={12} />}
```

**Large variant** — add in the top-right of the card content:

```typescript
// After the <div className="flex-1 min-w-0"> in the large variant, add a positioned badge:
{isGoogleEvent(event) && (
  <div className="shrink-0 mt-0.5">
    <GoogleBadge size={14} />
  </div>
)}
```

**Compact variant** — smaller badge:

```typescript
// Add at end of the inner flex div:
{isGoogleEvent(event) && (
  <div className="shrink-0">
    <GoogleBadge size={10} />
  </div>
)}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/calendar/components/calendar-event.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/components/calendar-event.tsx src/components/calendar/components/calendar-event.test.tsx
git commit -m "feat(calendar): add Google icon badge to event cards"
```

---

## Task 6: Event Detail Modal — Description, Google Link, Guard

**Files:**
- Modify: `src/components/calendar/components/event-detail-modal.tsx`
- Modify: `src/components/calendar/components/mobile-event-detail.tsx`

- [ ] **Step 1: Write tests for desktop EventDetailModal Google event behavior**

Create `src/components/calendar/components/event-detail-modal.test.tsx`:

```typescript
import { render, screen } from "@/test/test-utils";
import { userEvent } from "@testing-library/user-event";
import type { CalendarEvent } from "@/lib/types";
import { EventDetailModal } from "./event-detail-modal";

// Mock useIsMobile to test desktop variant
vi.mock("@/hooks", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/api", () => ({
  useFamilyMembers: () => [
    { id: "m1", name: "Alice", color: "coral" as const },
  ],
}));

// Mock toast
const mockToast = vi.fn();
vi.mock("@/components/ui/toaster", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

const baseEvent: CalendarEvent = {
  id: "e1",
  title: "Test Event",
  startTime: "09:00",
  endTime: "10:00",
  date: new Date("2026-01-15"),
  memberId: "m1",
  isAllDay: false,
};

const mockClose = vi.fn();
const mockEdit = vi.fn();
const mockDelete = vi.fn();

const defaultProps = {
  event: baseEvent,
  isOpen: true,
  onClose: mockClose,
  onEdit: mockEdit,
  onDelete: mockDelete,
};

describe("EventDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows description when present", () => {
    render(
      <EventDetailModal
        {...defaultProps}
        event={{ ...baseEvent, description: "Meeting notes here" }}
      />,
    );
    expect(screen.getByText("Meeting notes here")).toBeInTheDocument();
  });

  it("does not show description section when absent", () => {
    render(<EventDetailModal {...defaultProps} />);
    expect(screen.queryByText("Meeting notes here")).not.toBeInTheDocument();
  });

  it("shows 'Open in Google Calendar' link for Google events", () => {
    render(
      <EventDetailModal
        {...defaultProps}
        event={{
          ...baseEvent,
          source: "GOOGLE",
          htmlLink: "https://calendar.google.com/event/123",
        }}
      />,
    );
    const link = screen.getByRole("link", { name: /open in google calendar/i });
    expect(link).toHaveAttribute("href", "https://calendar.google.com/event/123");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows toast when clicking Edit on a Google event", async () => {
    const user = userEvent.setup();
    render(
      <EventDetailModal
        {...defaultProps}
        event={{ ...baseEvent, source: "GOOGLE" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(mockToast).toHaveBeenCalled();
    expect(mockEdit).not.toHaveBeenCalled();
  });

  it("shows toast when clicking Delete on a Google event", async () => {
    const user = userEvent.setup();
    render(
      <EventDetailModal
        {...defaultProps}
        event={{ ...baseEvent, source: "GOOGLE" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(mockToast).toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("calls onEdit normally for native events", async () => {
    const user = userEvent.setup();
    render(<EventDetailModal {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(mockEdit).toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/calendar/components/event-detail-modal.test.tsx`
Expected: FAIL

- [ ] **Step 3: Update EventDetailModal**

In `src/components/calendar/components/event-detail-modal.tsx`:

1. Import `toast` from `@/components/ui/toaster` and `ExternalLink`, `FileText` from `lucide-react`
2. Add a Google event guard helper:

```typescript
const isGoogleEvent = event.source === "GOOGLE";

const handleEditClick = () => {
  if (isGoogleEvent) {
    toast({
      title: "Synced from Google Calendar",
      description: "Edit this event in Google Calendar.",
      action: event.htmlLink ? (
        <ToastAction altText="Open in Google Calendar" asChild>
          <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
            Open
          </a>
        </ToastAction>
      ) : undefined,
    });
    return;
  }
  onEdit();
};

const handleDeleteAttempt = () => {
  if (isGoogleEvent) {
    toast({
      title: "Synced from Google Calendar",
      description: "Delete this event in Google Calendar.",
      action: event.htmlLink ? (
        <ToastAction altText="Open in Google Calendar" asChild>
          <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
            Open
          </a>
        </ToastAction>
      ) : undefined,
    });
    return;
  }
  handleDeleteClick();
};
```

3. Wire these handlers to the Edit and Delete buttons (replace `onEdit` with `handleEditClick`, `handleDeleteClick` with `handleDeleteAttempt`)

4. Add description display after location, before error message:

```tsx
{/* Description (conditional) */}
{event.description && (
  <div className="flex items-start gap-3 text-muted-foreground">
    <FileText className="w-4 h-4 shrink-0 mt-0.5" />
    <p className="text-sm whitespace-pre-wrap">{event.description}</p>
  </div>
)}

{/* Open in Google Calendar (conditional) */}
{isGoogleEvent && event.htmlLink && (
  <div className="flex items-center gap-3">
    <ExternalLink className="w-4 h-4 shrink-0 text-muted-foreground" />
    <a
      href={event.htmlLink}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-primary hover:underline"
    >
      Open in Google Calendar
    </a>
  </div>
)}
```

5. Also import `ToastAction` from `@/components/ui/toast`.

- [ ] **Step 4: Update MobileEventDetail with same changes**

In `src/components/calendar/components/mobile-event-detail.tsx`:

1. Import `toast` from `@/components/ui/toaster`, `ExternalLink`, `FileText` from `lucide-react`, `ToastAction` from `@/components/ui/toast`
2. Add the same Google event guard logic for Edit and Delete buttons
3. Add description display and "Open in Google Calendar" link in the detail rows section
4. Wire the guarded handlers to the Edit and Delete buttons in the header

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/calendar/components/event-detail-modal.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/calendar/components/event-detail-modal.tsx src/components/calendar/components/event-detail-modal.test.tsx src/components/calendar/components/mobile-event-detail.tsx
git commit -m "feat(calendar): add description, Google link, and edit/delete guard to event detail"
```

---

## Task 7: CalendarModule — Orchestrator-Level Google Event Guard

**Files:**
- Modify: `src/components/calendar/calendar-module.tsx`

- [ ] **Step 1: Add Google event guard to handleEditClick and handleDeleteEvent**

In `calendar-module.tsx`, import `toast` from `@/components/ui/toaster` and `ToastAction` from `@/components/ui/toast`.

Update `handleEditClick`:

```typescript
const handleEditClick = () => {
  if (!selectedEvent) return;

  // Guard: Google events are read-only
  if (selectedEvent.source === "GOOGLE") {
    toast({
      title: "Synced from Google Calendar",
      description: "Edit this event in Google Calendar.",
      action: selectedEvent.htmlLink ? (
        <ToastAction altText="Open in Google Calendar" asChild>
          <a href={selectedEvent.htmlLink} target="_blank" rel="noopener noreferrer">
            Open
          </a>
        </ToastAction>
      ) : undefined,
    });
    return;
  }

  if (selectedEvent.isRecurring) {
    setScopeAction("edit");
    setScopeDialogOpen(true);
  } else {
    openEditModal(selectedEvent);
  }
};
```

Update `handleDeleteEvent`:

```typescript
const handleDeleteEvent = () => {
  if (!selectedEvent) return;

  // Guard: Google events are read-only
  if (selectedEvent.source === "GOOGLE") {
    toast({
      title: "Synced from Google Calendar",
      description: "Delete this event in Google Calendar.",
      action: selectedEvent.htmlLink ? (
        <ToastAction altText="Open in Google Calendar" asChild>
          <a href={selectedEvent.htmlLink} target="_blank" rel="noopener noreferrer">
            Open
          </a>
        </ToastAction>
      ) : undefined,
    });
    return;
  }

  if (selectedEvent.isRecurring) {
    setScopeAction("delete");
    setScopeDialogOpen(true);
  } else {
    if (!selectedEvent.id) return;
    deleteEvent.mutate(selectedEvent.id);
  }
};
```

Also add `description` to `handleAddEvent` and `handleUpdateEvent` request objects:

```typescript
// In handleAddEvent, add to the request:
description: formData.description,

// In handleUpdateEvent, add to the request:
description: formData.description,
```

- [ ] **Step 2: Run type check and existing tests**

Run: `npx tsc --noEmit && npx vitest run --reporter=verbose`
Expected: All pass — no behavioral change for native events.

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/calendar-module.tsx
git commit -m "feat(calendar): add Google event guard at orchestrator level and description in mutations"
```

---

## Task 8: Event Form — Collapsible Description Field

**Files:**
- Modify: `src/components/calendar/components/event-form.tsx`

- [ ] **Step 1: Write tests for description field behavior**

Add tests to `src/components/calendar/components/event-form.test.tsx` (create if doesn't exist):

```typescript
import { render, screen } from "@/test/test-utils";
import { userEvent } from "@testing-library/user-event";
import { EventForm } from "./event-form";

vi.mock("@/api", () => ({
  useFamilyMembers: () => [
    { id: "m1", name: "Alice", color: "coral" as const },
  ],
}));

describe("EventForm description field", () => {
  const defaultProps = {
    mode: "add" as const,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  it("hides description textarea by default in add mode", () => {
    render(<EventForm {...defaultProps} />);
    expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument();
    expect(screen.getByText(/add description/i)).toBeInTheDocument();
  });

  it("shows description textarea when 'Add description' is clicked", async () => {
    const user = userEvent.setup();
    render(<EventForm {...defaultProps} />);

    await user.click(screen.getByText(/add description/i));
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it("auto-expands in edit mode when description has value", () => {
    render(
      <EventForm
        {...defaultProps}
        mode="edit"
        defaultValues={{
          title: "Test",
          date: "2026-01-15",
          startTime: "09:00",
          endTime: "10:00",
          memberId: "m1",
          description: "Some notes",
        }}
      />,
    );
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toHaveValue("Some notes");
  });

  it("does not auto-expand in edit mode when description is empty", () => {
    render(
      <EventForm
        {...defaultProps}
        mode="edit"
        defaultValues={{
          title: "Test",
          date: "2026-01-15",
          startTime: "09:00",
          endTime: "10:00",
          memberId: "m1",
        }}
      />,
    );
    expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/calendar/components/event-form.test.tsx`
Expected: FAIL

- [ ] **Step 3: Add collapsible description to EventForm**

In `src/components/calendar/components/event-form.tsx`:

1. Import `ChevronDown` from `lucide-react`
2. Add `useState` for description visibility:

```typescript
const [showDescription, setShowDescription] = useState(false);
```

3. Watch the description value:

```typescript
const descriptionValue = watch("description");
```

4. Auto-expand if description has a value (in the existing useEffect or a new one):

```typescript
useEffect(() => {
  if (initialValues.description) {
    setShowDescription(true);
  }
}, [initialValues.description]);
```

5. Add the description section after the "Assign To" (member selector) section, before the action buttons. Note: the form has no location input field — location is only shown on event cards and detail modals.

```tsx
{/* Description (collapsible) */}
<div className="space-y-2">
  {!showDescription ? (
    <button
      type="button"
      onClick={() => setShowDescription(true)}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ChevronDown className="w-3.5 h-3.5" />
      Add description
    </button>
  ) : (
    <>
      <Label htmlFor="description">Description</Label>
      <textarea
        id="description"
        {...register("description")}
        placeholder="Add notes or details..."
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y",
          errors.description && "border-destructive",
        )}
        maxLength={2000}
        aria-invalid={!!errors.description}
      />
      {descriptionValue && descriptionValue.length > 1900 && (
        <p className="text-xs text-muted-foreground text-right">
          {descriptionValue.length}/2000
        </p>
      )}
      <FormError message={errors.description?.message} />
    </>
  )}
</div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/calendar/components/event-form.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/components/event-form.tsx src/components/calendar/components/event-form.test.tsx
git commit -m "feat(calendar): add collapsible description field to event form"
```

---

## Task 9: Google Calendar Picker Modal

> **Note:** This task is ordered before the Google Calendar Section (Task 10) because `GoogleCalendarSection` imports `GoogleCalendarPickerModal`.

**Files:**
- Create: `src/components/settings/google-calendar-picker-modal.tsx`

- [ ] **Step 1: Write tests for GoogleCalendarPickerModal**

Create `src/components/settings/google-calendar-picker-modal.test.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@/test/test-utils";
import { userEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { server } from "@/test/mocks/server";
import { GoogleCalendarPickerModal } from "./google-calendar-picker-modal";

const MEMBER_ID = "member-123";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("GoogleCalendarPickerModal", () => {
  beforeEach(() => {
    server.use(
      http.get(`*/google/calendars/${MEMBER_ID}`, () =>
        HttpResponse.json({
          data: [
            { id: "primary", name: "Main Calendar", primary: true, enabled: true },
            { id: "work@group.calendar.google.com", name: "Work", primary: false, enabled: false },
          ],
          message: null,
        }),
      ),
    );
  });

  it("shows calendars with checkboxes", async () => {
    render(
      <GoogleCalendarPickerModal
        open={true}
        onOpenChange={vi.fn()}
        memberId={MEMBER_ID}
      />,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByText(/Main Calendar/i)).toBeInTheDocument();
    expect(screen.getByText(/\(Primary\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Work/i)).toBeInTheDocument();
  });

  it("primary calendar is checked, non-enabled is unchecked", async () => {
    render(
      <GoogleCalendarPickerModal
        open={true}
        onOpenChange={vi.fn()}
        memberId={MEMBER_ID}
      />,
      { wrapper: createWrapper() },
    );

    const checkboxes = await screen.findAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked(); // Main Calendar — enabled: true
    expect(checkboxes[1]).not.toBeChecked(); // Work — enabled: false
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/settings/google-calendar-picker-modal.test.tsx`
Expected: FAIL

- [ ] **Step 3: Create the component**

```typescript
// src/components/settings/google-calendar-picker-modal.tsx
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useGoogleCalendars, useUpdateGoogleCalendars } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";

interface GoogleCalendarPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
}

export function GoogleCalendarPickerModal({
  open,
  onOpenChange,
  memberId,
}: GoogleCalendarPickerModalProps) {
  const { data: calendarsResponse, isLoading } = useGoogleCalendars(memberId, open);
  const updateCalendars = useUpdateGoogleCalendars();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const calendars = calendarsResponse?.data ?? [];

  // Sort: primary first, then alphabetical
  const sortedCalendars = [...calendars].sort((a, b) => {
    if (a.primary && !b.primary) return -1;
    if (!a.primary && b.primary) return 1;
    return a.name.localeCompare(b.name);
  });

  // Sync local state when data loads — use stringified key to avoid
  // infinite re-renders from unstable array references
  const calendarKey = calendars.map((c) => `${c.id}:${c.enabled}`).join(",");
  useEffect(() => {
    if (calendars.length > 0) {
      setSelectedIds(new Set(calendars.filter((c) => c.enabled).map((c) => c.id)));
    }
  }, [calendarKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = (calendarId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }
      return next;
    });
  };

  const handleSave = () => {
    updateCalendars.mutate(
      { memberId, calendarIds: Array.from(selectedIds) },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast({ title: "Calendars updated", description: "Your calendar selection has been saved." });
        },
        onError: () => {
          toast({ title: "Update failed", description: "Could not save calendar selection.", variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Choose Calendars</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {sortedCalendars.map((cal) => (
              <label
                key={cal.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(cal.id)}
                  onChange={() => handleToggle(cal.id)}
                  className="rounded border-border"
                />
                <span className="text-sm">
                  {cal.name}
                  {cal.primary && (
                    <span className="text-muted-foreground ml-1">(Primary)</span>
                  )}
                </span>
              </label>
            ))}
            {sortedCalendars.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No calendars found
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateCalendars.isPending || isLoading}
          >
            {updateCalendars.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Update settings barrel export**

Check if `src/components/settings/index.ts` exists and add exports for the new components:

```typescript
export { GoogleCalendarSection } from "./google-calendar-section";
export { GoogleCalendarPickerModal } from "./google-calendar-picker-modal";
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/settings/google-calendar-picker-modal.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/google-calendar-picker-modal.tsx src/components/settings/google-calendar-picker-modal.test.tsx src/components/settings/index.ts
git commit -m "feat(settings): add Google Calendar picker modal"
```

---

## Task 10: Google Calendar Section in Member Profile

**Files:**
- Create: `src/components/settings/google-calendar-section.tsx`
- Modify: `src/components/settings/member-profile-modal.tsx`

- [ ] **Step 1: Write tests for GoogleCalendarSection**

Create `src/components/settings/google-calendar-section.test.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@/test/test-utils";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { server } from "@/test/mocks/server";
import { GoogleCalendarSection } from "./google-calendar-section";

const MEMBER_ID = "member-123";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("GoogleCalendarSection", () => {
  describe("disconnected state", () => {
    beforeEach(() => {
      server.use(
        http.get(`*/google/status/${MEMBER_ID}`, () =>
          HttpResponse.json({
            data: { connected: false, calendars: [] },
            message: null,
          }),
        ),
      );
    });

    it("shows connect button when member has email", async () => {
      render(
        <GoogleCalendarSection memberId={MEMBER_ID} memberEmail="test@example.com" memberName="Alice" />,
        { wrapper: createWrapper() },
      );

      expect(await screen.findByRole("button", { name: /connect google calendar/i })).toBeInTheDocument();
    });

    it("disables connect button when member has no email", async () => {
      render(
        <GoogleCalendarSection memberId={MEMBER_ID} memberEmail="" memberName="Alice" />,
        { wrapper: createWrapper() },
      );

      const button = await screen.findByRole("button", { name: /connect google calendar/i });
      expect(button).toBeDisabled();
      expect(screen.getByText(/add an email/i)).toBeInTheDocument();
    });
  });

  describe("connected state", () => {
    beforeEach(() => {
      server.use(
        http.get(`*/google/status/${MEMBER_ID}`, () =>
          HttpResponse.json({
            data: {
              connected: true,
              calendars: [
                { id: "primary", name: "Main Calendar", enabled: true, lastSyncedAt: "2026-03-20T10:00:00Z" },
              ],
            },
            message: null,
          }),
        ),
      );
    });

    it("shows connected status and action buttons", async () => {
      render(
        <GoogleCalendarSection memberId={MEMBER_ID} memberEmail="test@example.com" memberName="Alice" />,
        { wrapper: createWrapper() },
      );

      expect(await screen.findByText(/connected/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /choose calendars/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sync now/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/settings/google-calendar-section.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create GoogleCalendarSection component**

```typescript
// src/components/settings/google-calendar-section.tsx
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import {
  googleCalendarService,
  useDisconnectGoogle,
  useGoogleConnectionStatus,
  useSyncGoogleCalendar,
} from "@/api";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { GoogleCalendarPickerModal } from "./google-calendar-picker-modal";

interface GoogleCalendarSectionProps {
  memberId: string;
  memberEmail: string;
  memberName: string;
}

export function GoogleCalendarSection({
  memberId,
  memberEmail,
  memberName,
}: GoogleCalendarSectionProps) {
  const { data: statusResponse, isLoading } = useGoogleConnectionStatus(memberId);
  const syncMutation = useSyncGoogleCalendar();
  const disconnectMutation = useDisconnectGoogle();
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const status = statusResponse?.data;
  const isConnected = status?.connected ?? false;
  const isSyncing = syncMutation.isPending;

  const handleConnect = async () => {
    try {
      const response = await googleCalendarService.getAuthUrl(memberId);
      // Save return state before redirect
      sessionStorage.setItem(
        "google-auth-return",
        JSON.stringify({
          memberId,
          returnTo: "member-profile",
          timestamp: Date.now(),
        }),
      );
      window.location.href = response.data.url;
    } catch {
      toast({
        title: "Connection failed",
        description: "Could not connect to Google Calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSync = () => {
    syncMutation.mutate(memberId, {
      onSuccess: () => {
        toast({ title: "Sync started", description: "Your Google Calendar events are being synced." });
      },
      onError: () => {
        toast({ title: "Sync failed", description: "Could not sync. Please try again.", variant: "destructive" });
      },
    });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate(memberId, {
      onSuccess: () => {
        setShowDisconnectConfirm(false);
        toast({ title: "Disconnected", description: "Google Calendar has been disconnected." });
      },
      onError: () => {
        toast({ title: "Disconnect failed", description: "Could not disconnect. Please try again.", variant: "destructive" });
      },
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Google Calendar</p>
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  // Get last synced time from first calendar
  const lastSyncedAt = status?.calendars?.[0]?.lastSyncedAt;
  const lastSyncedLabel = lastSyncedAt
    ? `Last synced ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`
    : "Never synced";

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Google Calendar</p>

      {!isConnected ? (
        // Disconnected state
        <div className="space-y-2">
          <Button
            type="button"
            onClick={handleConnect}
            disabled={!memberEmail}
            className="w-full"
          >
            Connect Google Calendar
          </Button>
          {!memberEmail && (
            <p className="text-xs text-muted-foreground">
              Add an email address to connect Google Calendar
            </p>
          )}
        </div>
      ) : (
        // Connected state
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-foreground">Connected</span>
          </div>
          <p className="text-xs text-muted-foreground">{lastSyncedLabel}</p>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCalendarPicker(true)}
            >
              Choose Calendars
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Sync Now"
              )}
            </Button>
          </div>

          {/* Disconnect */}
          {showDisconnectConfirm ? (
            <div className="space-y-2 p-3 border border-border rounded-md">
              <p className="text-xs text-muted-foreground">
                This will remove all synced Google events for {memberName}.
                Events created in FamilyHub are not affected.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisconnectConfirm(false)}
                  disabled={disconnectMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? "Disconnecting..." : "Confirm Disconnect"}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDisconnectConfirm(true)}
              className="text-xs text-destructive hover:underline"
            >
              Disconnect
            </button>
          )}
        </div>
      )}

      {/* Calendar Picker Modal */}
      <GoogleCalendarPickerModal
        open={showCalendarPicker}
        onOpenChange={setShowCalendarPicker}
        memberId={memberId}
      />
    </div>
  );
}
```

- [ ] **Step 4: Update MemberProfileModal**

In `src/components/settings/member-profile-modal.tsx`:

1. Import `GoogleCalendarSection` from `./google-calendar-section`
2. Replace the email helper text (lines 258-263) — remove "Used for Google Calendar sync (coming soon)"
3. Add the Google Calendar section after the email field div, before the action buttons:

```tsx
{/* Google Calendar */}
<GoogleCalendarSection
  memberId={memberId}
  memberEmail={watch("email") || member?.email || ""}
  memberName={member?.name || ""}
/>
```

The `watch("email")` ensures the connect button enables/disables reactively as the user types an email.

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/settings/google-calendar-section.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/google-calendar-section.tsx src/components/settings/google-calendar-section.test.tsx src/components/settings/member-profile-modal.tsx
git commit -m "feat(settings): add Google Calendar connection section to member profile"
```

---

## Task 11: OAuth Return Hook

**Files:**
- Create: `src/hooks/use-google-auth-return.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write tests**

Create `src/hooks/use-google-auth-return.test.ts`:

```typescript
import { renderHook } from "@testing-library/react";
import { useGoogleAuthReturn } from "./use-google-auth-return";

// Mock toast
const mockToast = vi.fn();
vi.mock("@/components/ui/toaster", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

// Mock stores
const mockOpenSidebar = vi.fn();
vi.mock("@/stores", () => ({
  useAppStore: {
    getState: () => ({ openSidebar: mockOpenSidebar }),
  },
}));

describe("useGoogleAuthReturn", () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    replaceStateSpy = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
    // Reset URL
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "" },
      writable: true,
    });
  });

  it("does nothing when no google-auth query param", () => {
    renderHook(() => useGoogleAuthReturn());
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("shows success toast on googleConnected=true", () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?googleConnected=true" },
      writable: true,
    });

    sessionStorage.setItem(
      "google-auth-return",
      JSON.stringify({ memberId: "m1", returnTo: "member-profile", timestamp: Date.now() }),
    );

    renderHook(() => useGoogleAuthReturn());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("Connected") }),
    );
  });

  it("shows error toast on error param", () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?error=consent_denied" },
      writable: true,
    });

    renderHook(() => useGoogleAuthReturn());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
  });

  it("cleans up query params and sessionStorage", () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?googleConnected=true" },
      writable: true,
    });

    sessionStorage.setItem("google-auth-return", JSON.stringify({ memberId: "m1", timestamp: Date.now() }));

    renderHook(() => useGoogleAuthReturn());

    expect(replaceStateSpy).toHaveBeenCalled();
    expect(sessionStorage.getItem("google-auth-return")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/use-google-auth-return.test.ts`
Expected: FAIL

- [ ] **Step 3: Create the hook**

```typescript
// src/hooks/use-google-auth-return.ts
import { useEffect } from "react";
import { toast } from "@/components/ui/toaster";
import { useAppStore } from "@/stores";

const STORAGE_KEY = "google-auth-return";
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

interface GoogleAuthReturnState {
  memberId: string;
  returnTo: string;
  timestamp: number;
}

/**
 * Handles the OAuth return flow after Google redirects back to the app.
 *
 * BE redirects to:
 * - /?googleConnected=true (on success)
 * - /?error=consent_denied (user denied consent)
 * - /?error=token_exchange_failed (server error)
 *
 * Note: The BE redirect URL is configured with a base path (e.g., /settings)
 * but we check query params regardless of path since the app is a SPA.
 */
export function useGoogleAuthReturn() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("googleConnected");
    const error = params.get("error");

    if (!success && !error) return;

    // Clean up query params
    const url = new URL(window.location.href);
    url.searchParams.delete("googleConnected");
    url.searchParams.delete("error");
    window.history.replaceState({}, "", url.pathname + url.search);

    // Read and clean up return state
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);

    let returnState: GoogleAuthReturnState | null = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as GoogleAuthReturnState;
        // Ignore stale entries
        if (Date.now() - parsed.timestamp < STALE_THRESHOLD_MS) {
          returnState = parsed;
        }
      } catch {
        // Ignore corrupt data
      }
    }

    if (success === "true") {
      toast({
        title: "Google Calendar Connected",
        description: "Your Google Calendar events will appear shortly.",
      });

      // Restore UI state: open sidebar so user can see member profile
      if (returnState) {
        useAppStore.getState().openSidebar();
        // The member profile modal needs to be opened by the sidebar.
        // We store the memberId so the sidebar can auto-open the profile.
        // This is handled via a sessionStorage flag that SidebarMenu reads.
        sessionStorage.setItem(
          "open-member-profile",
          returnState.memberId,
        );
      }
    } else if (error) {
      const messages: Record<string, string> = {
        consent_denied: "Google Calendar access was denied. You can try again anytime.",
        token_exchange_failed: "Failed to connect Google Calendar. Please try again.",
      };
      toast({
        title: "Connection failed",
        description: messages[error] ?? "Failed to connect Google Calendar. Please try again.",
        variant: "destructive",
      });
    }
  }, []);
}
```

- [ ] **Step 4: Update SidebarMenu to read the auto-open flag**

In `src/components/shared/sidebar-menu.tsx`, add a `useEffect` that checks for the `open-member-profile` flag in sessionStorage when the sidebar opens:

```typescript
// After the existing state declarations, add:
useEffect(() => {
  if (isOpen) {
    const autoOpenMemberId = sessionStorage.getItem("open-member-profile");
    if (autoOpenMemberId) {
      sessionStorage.removeItem("open-member-profile");
      setSelectedMemberId(autoOpenMemberId);
    }
  }
}, [isOpen]);
```

- [ ] **Step 5: Wire the hook in App.tsx**

In `src/App.tsx`, import and call the hook inside `FamilyHub`:

```typescript
import { useGoogleAuthReturn } from "@/hooks/use-google-auth-return";

// Inside FamilyHub, before the hydration gate:
useGoogleAuthReturn();
```

Also update `src/hooks/index.ts` barrel export:

```typescript
export { useGoogleAuthReturn } from "./use-google-auth-return";
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/hooks/use-google-auth-return.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-google-auth-return.ts src/hooks/use-google-auth-return.test.ts src/hooks/index.ts src/App.tsx src/components/shared/sidebar-menu.tsx
git commit -m "feat(auth): add Google OAuth return handler with state restoration"
```

---

## Task 12: Final Integration — Type Check, Lint, Full Test Suite

**Files:** None (verification only)

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No errors. If formatting issues, run `npm run format` first.

- [ ] **Step 3: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass, including new tests from this implementation.

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`

Verify:
1. Calendar renders normally (no regressions)
2. Member profile modal shows Google Calendar section (disconnected state)
3. Event form shows "Add description" collapsible
4. Create an event with a description — verify it persists
5. No console errors

- [ ] **Step 6: Commit any final fixes**

If any fixes were needed:

```bash
git add -A
git commit -m "fix: resolve integration issues from Google Calendar FE integration"
```

---

## Task 13: E2E Tests

**Files:**
- Create: `e2e/google-calendar.spec.ts`

- [ ] **Step 1: Write E2E tests for the settings UI and event display**

```typescript
// e2e/google-calendar.spec.ts
import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  waitForCalendarReady,
  waitForHydration,
} from "./helpers/test-helpers";

test.describe("Google Calendar Integration", () => {
  test.beforeEach(async ({ page, request }) => {
    await page.goto("/");
    await clearStorage(page);

    const reg = await registerFamily(request, {
      familyName: "Test Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    await seedBrowserAuth(page, reg);

    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);
  });

  test("member profile shows Google Calendar section", async ({ page }) => {
    // Open sidebar
    await page.getByRole("button", { name: /settings/i }).click();

    // Click on member name to open profile
    await page.getByText("Alice").click();

    // Verify Google Calendar section is visible
    await expect(page.getByText("Google Calendar")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /connect google calendar/i }),
    ).toBeVisible();
  });

  test("connect button is disabled without email", async ({ page }) => {
    await page.getByRole("button", { name: /settings/i }).click();
    await page.getByText("Alice").click();

    const connectButton = page.getByRole("button", {
      name: /connect google calendar/i,
    });
    await expect(connectButton).toBeDisabled();
    await expect(page.getByText(/add an email/i)).toBeVisible();
  });

  test("event form has collapsible description field", async ({ page }) => {
    // Open add event modal
    await page.getByRole("button", { name: /add event/i }).click();

    // Description should be collapsed
    await expect(page.getByText(/add description/i)).toBeVisible();
    await expect(page.getByLabelText(/description/i)).not.toBeVisible();

    // Expand it
    await page.getByText(/add description/i).click();
    await expect(page.getByLabelText(/description/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run E2E tests**

Run: `npm run test:e2e -- --grep "Google Calendar"`
Expected: PASS (tests that don't require real Google OAuth)

- [ ] **Step 3: Commit**

```bash
git add e2e/google-calendar.spec.ts
git commit -m "test(e2e): add Google Calendar integration E2E tests"
```

---

## Task 14: Update Spec — Confirm BE Redirect Params

**Files:**
- Modify: `docs/superpowers/specs/2026-03-20-google-calendar-fe-integration.md`

- [ ] **Step 1: Update the spec with confirmed redirect params**

Replace the "assumed" language in Section 3 with the confirmed values from the BE:

- Success: `?googleConnected=true`
- Error (consent denied): `?error=consent_denied`
- Error (token exchange): `?error=token_exchange_failed`

The BE redirects to the configured `frontendRedirectUrl` which includes `/settings` in the path — but since our SPA handles routing client-side, the `useGoogleAuthReturn` hook checks query params regardless of path.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-03-20-google-calendar-fe-integration.md
git commit -m "docs: confirm BE OAuth redirect params in spec"
```
