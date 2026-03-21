# Google Calendar FE Integration — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Scope:** Phase 1b — FE integration for read-only Google Calendar sync
**Depends on:** BE Google Calendar integration (complete, merged), [google-calendar-integration-design.md](../../google-calendar-integration-design.md)

---

## Overview

Add frontend support for Google Calendar integration. Family members can connect their Google accounts from their member profile, select which calendars to sync, and see Google events rendered alongside native events on the calendar. Google events are read-only in Phase 1 — edit/delete actions show a toast directing users to Google Calendar.

The BE already returns Google events mixed into the regular `GET /api/calendar/events` response, so the existing event fetching path is unchanged. This spec covers: new API hooks for Google connection management, type extensions, UI changes to the member profile, event cards, event detail modal, and event form.

---

## 1. Type Changes

### CalendarEvent — extend with three optional fields

```typescript
// src/lib/types/calendar.ts
interface CalendarEvent {
  // ... existing fields ...
  source?: "NATIVE" | "GOOGLE";   // defaults to NATIVE from BE
  description?: string;            // both native and Google events
  htmlLink?: string;               // Google events only — opens in Google Calendar
}
```

All optional — existing code continues working unchanged.

### Request types — add description

Add `description?: string` to both `CreateEventRequest` and `UpdateEventRequest`.

### New types — google-calendar.ts

```typescript
// src/lib/types/google-calendar.ts
interface GoogleCalendarInfo {
  id: string;            // "primary" or specific calendar ID
  name: string;
  primary: boolean;
  enabled: boolean;
}

interface GoogleConnectionStatus {
  connected: boolean;
  calendars: Array<{
    id: string;
    name: string;
    enabled: boolean;
    lastSyncedAt: string | null;
  }>;
}
```

### Zod schema update

```typescript
// src/lib/validations/calendar.ts
description: z.string().max(2000, "Description must be 2000 characters or less").optional(),
```

---

## 2. API Layer

### New service: google-calendar.service.ts

Handles all `/api/google/*` endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `getAuthUrl(memberId)` | `GET /api/google/auth?memberId={uuid}` | Returns OAuth redirect URL |
| `getConnectionStatus(memberId)` | `GET /api/google/status/{memberId}` | Returns connection status |
| `getCalendars(memberId)` | `GET /api/google/calendars/{memberId}` | Lists available Google calendars |
| `updateCalendars(memberId, calendarIds)` | `PUT /api/google/calendars/{memberId}` | Sets which calendars to sync |
| `syncNow(memberId)` | `POST /api/google/sync/{memberId}` | Triggers manual sync |
| `disconnect(memberId)` | `DELETE /api/google/disconnect/{memberId}` | Revokes tokens, removes Google events |

### New hooks: use-google-calendar.ts

**Query key factory:**

```typescript
googleCalendarKeys = {
  all:                         ["google-calendar"],
  status: (memberId) =>       ["google-calendar", "status", memberId],
  calendars: (memberId) =>    ["google-calendar", "calendars", memberId],
}
```

**Hooks:**

| Hook | Type | Invalidates |
|------|------|-------------|
| `useGoogleConnectionStatus(memberId)` | Query | — |
| `useGoogleCalendars(memberId)` | Query | — |
| `useUpdateGoogleCalendars(callbacks)` | Mutation | `calendars`, `status` |
| `useSyncGoogleCalendar(callbacks)` | Mutation | `status`, `calendarKeys.events()` |
| `useDisconnectGoogle(callbacks)` | Mutation | `status`, `calendarKeys.events()` |

### Existing calendar hooks — no changes

The BE returns Google events in the regular events endpoint. `useCalendarEvents` works as-is — the three new optional fields flow through automatically via the extended `CalendarEvent` type.

---

## 3. OAuth Flow & Return State

### Initiating the flow

1. User clicks "Connect Google Calendar" in the member profile modal
2. FE calls `getAuthUrl(memberId)` to get the OAuth URL
3. Save return state to `sessionStorage`: `{ memberId, returnTo: "member-profile", timestamp }`
4. `window.location.href = oauthUrl` — user leaves the app

### Handling the return

The BE callback redirects to the FE with a query param (e.g., `/?google-auth=success` or `/?google-auth=error`).

1. On app mount, check for `google-auth` query param
2. If present, read return state from `sessionStorage`, clean up both (query param via `replaceState`, storage entry)
3. On success: open sidebar → open member profile modal for the saved `memberId` → show success toast
4. On error: show error toast with message
5. Stale entries ignored via timestamp check

### Implementation

A `useGoogleAuthReturn()` hook that runs once on mount in `App.tsx`. Handles detection, restoration, and cleanup.

**Why sessionStorage:** Survives the redirect but scoped to the current tab and cleared when the tab closes. No stale state lingers.

---

## 4. Member Profile Modal — Google Calendar Section

### Placement

Below the email field in `MemberProfileModal`. The email field already has helper text saying "Used for Google Calendar sync (coming soon)" — replace that with the actual integration.

### Three states

**Disconnected:**
- "Connect Google Calendar" button (primary style)
- Disabled if member has no email saved, with hint: "Add an email address to connect Google Calendar"

**Connected:**
- Green dot + "Connected" status text
- "Last synced: 5 minutes ago" (relative time, or "Never" if null)
- "Choose Calendars" button → opens `GoogleCalendarPickerModal`
- "Sync Now" button (secondary)
- "Disconnect" button (destructive/red text)

**Syncing:**
- Same as connected, but "Sync Now" shows a spinner and is disabled

### GoogleCalendarPickerModal

Separate modal (opened from "Choose Calendars" button) with:
- Checkboxes for each calendar from `useGoogleCalendars(memberId)`
- Calendar names as labels, primary calendar indicated
- Save button calls `useUpdateGoogleCalendars` and triggers a sync
- Cancel to dismiss

### Disconnect confirmation

Confirmation dialog: "This will remove all synced Google events for {memberName}. Events created in FamilyHub are not affected." Then calls `useDisconnectGoogle`.

---

## 5. Event Display Changes

### CalendarEventCard — Google icon overlay

- When `source === "GOOGLE"`, render a small Google "G" SVG in the top-right corner
- Size scales with card variant: ~14px for default/large, ~10px for compact
- Semi-transparent background pill (`bg-white/70 rounded-full`) for visibility against any member color
- Inline SVG — no icon library addition needed

### EventDetailModal — Google event handling

- **Description field:** Display for all events when present (below location, muted body text style)
- **Google events:** Show "Open in Google Calendar" link using `htmlLink` (opens in new tab)
- **Edit/Delete guard:** Buttons remain visible. Clicking either shows a toast: "This event is synced from Google Calendar. Edit it in Google Calendar." with an optional "Open in Google Calendar" action on the toast
- **Recurrence label:** Works automatically — Google recurring instances carry `recurrenceRule` from BE expansion

### MobileEventDetail

Same treatment as desktop: description display, Google guard toast, "Open in Google Calendar" link.

### CalendarModule — orchestrator-level guard

Before opening edit modal or running delete, check `event.source === "GOOGLE"`. If true, show toast and bail. Catches all entry points and prevents the edit modal or scope dialog from opening.

---

## 6. Event Form — Description Field

### Collapsible description

- "Add description" link below the location field, collapsed by default in "add" mode
- In "edit" mode, auto-expand if the event already has a description
- Reveals a `textarea` with placeholder "Add notes or details..."
- Max 2000 chars; character counter appears only near limit (1900+)

### Submission

- `description` included in request when present
- Empty/untouched → omitted (`undefined`, not `""`)

### Google events

Never reach the form — the guard in §5 prevents it. No special handling needed.

---

## 7. Testing Strategy

### Unit tests

| Component/Hook | What to test |
|---------------|-------------|
| `useGoogleConnectionStatus` | Mock MSW responses, verify query behavior |
| `useGoogleCalendars` | Mock MSW responses, verify query behavior |
| `useSyncGoogleCalendar` | Verify mutation + cache invalidation (`status` + `calendarKeys.events()`) |
| `useDisconnectGoogle` | Verify mutation + cache invalidation |
| `CalendarEventCard` | Google icon renders for `source === "GOOGLE"`, absent for `"NATIVE"` |
| `EventDetailModal` | Description displays, "Open in Google Calendar" link for Google events, toast on Edit/Delete |
| `EventForm` | Description collapse/expand, value in submission |
| Member profile Google section | Three states render correctly based on connection status |
| `useGoogleAuthReturn` | Mock `window.location.search`, verify sessionStorage read + cleanup |

### E2E tests

- Cannot test real Google OAuth in CI — mock API responses
- Member profile: "Connect Google Calendar" button visible, connected state renders, disconnect flow
- Calendar picker modal: opens, saves selections
- Event display: seed Google-sourced events, verify icon visible, verify edit/delete toast

### Existing tests

No changes needed — Google events flow through the same `useCalendarEvents` hook.

---

## 8. New Files

| File | Purpose |
|------|---------|
| `src/lib/types/google-calendar.ts` | `GoogleCalendarInfo`, `GoogleConnectionStatus` types |
| `src/api/services/google-calendar.service.ts` | Google Calendar API service |
| `src/api/hooks/use-google-calendar.ts` | TanStack Query hooks for Google connection |
| `src/components/settings/google-calendar-section.tsx` | Google Calendar section in member profile |
| `src/components/settings/google-calendar-picker-modal.tsx` | Calendar selection modal |
| `src/hooks/use-google-auth-return.ts` | OAuth return detection + state restoration |

### Modified files

| File | Change |
|------|--------|
| `src/lib/types/calendar.ts` | Add `source`, `description`, `htmlLink` to `CalendarEvent`; add `description` to request types |
| `src/lib/validations/calendar.ts` | Add `description` to Zod schema |
| `src/components/calendar/components/calendar-event.tsx` | Google "G" icon overlay |
| `src/components/calendar/components/event-detail-modal.tsx` | Description display, Google link, edit/delete guard toast |
| `src/components/calendar/components/mobile-event-detail.tsx` | Same as above |
| `src/components/calendar/components/event-form.tsx` | Collapsible description textarea |
| `src/components/calendar/calendar-module.tsx` | Google event guard before edit/delete actions |
| `src/components/settings/member-profile-modal.tsx` | Add Google Calendar section, remove "coming soon" text |
| `src/App.tsx` | Call `useGoogleAuthReturn()` hook |
| `src/api/index.ts` | Barrel export new Google Calendar hooks/service |
| `src/lib/types/index.ts` | Barrel export new Google Calendar types |
