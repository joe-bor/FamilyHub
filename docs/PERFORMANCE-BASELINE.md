# Calendar Performance Optimization

**Date:** December 22, 2024
**Branch:** `perf/calendar-rendering-optimization`

## Optimizations Implemented

### 1. React Compiler (Commit 1)
Enabled `babel-plugin-react-compiler` for automatic memoization of components and values.

**Verification:** In React DevTools, optimized components show "Memo ✨" badge.

### 2. Shared Time Utilities (Commit 2)
Created `src/lib/time-utils.ts` with pre-compiled regex for time parsing.

**Before:** Each view had its own `parseTime()` function compiling regex on every call
**After:** Single shared module with compiled `TIME_REGEX` constant

### 3. O(1) Family Member Lookup (Commits 2, 5)
Replaced `familyMembers.find((m) => m.id === id)` with `getFamilyMember(id)` Map lookup.

**Before:** O(n) array search on every lookup (5 iterations max)
**After:** O(1) Map.get() lookup

**Files updated:**
- `src/lib/types/family.ts` - Added `familyMemberMap` and `getFamilyMember()`
- `src/components/calendar/components/calendar-event.tsx`
- `src/components/calendar/views/monthly-calendar.tsx`
- `src/components/calendar/views/schedule-calendar.tsx`
- `src/components/chores-view.tsx`

### 4. Zustand Compound Selectors (Commit 3)
Reduced Zustand store subscriptions using `useShallow` compound selectors.

**Before:** CalendarModule had 10 separate `useCalendarStore()` calls
**After:** 2 compound selectors (`useCalendarState`, `useCalendarActions`)

**Why still needed:** React Compiler doesn't optimize external store subscriptions.

### 5. Pre-computed Events by Date (Commit 4)
Replaced per-cell filtering with single-pass pre-computation using `useMemo`.

**Weekly View:**
- Before: `getEventsForDay()` called 14× per render (7 headers + 7 columns)
- After: Single `eventsByDay` Map computed once via `useMemo`

**Monthly View:**
- Before: `getEventsForDay()` + `getMembersWithEvents()` called ~70× per render
- After: Single `dayData` Map with events + members computed once via `useMemo`

**Daily View:**
- Added `useMemo` for `dayEvents` filtering
- Added `useMemo` for O(n²) `calculateEventColumns()` layout computation

**Schedule View:**
- Wrapped grouped events computation in `useMemo`
- Fixed buggy time sorting (was using `parseInt` which only reads first digit)

---

## Measurement Methodology

### Option 1: React DevTools Profiler

1. Open React DevTools → Profiler tab
2. Click Record, perform interactions, click Stop
3. Examine:
   - **Flamegraph:** Render duration per component
   - **Ranked:** Slowest components
   - **Commit count:** Number of re-renders

### Option 2: Console Profiler Output

The `<Profiler>` wrapper in `CalendarModule` logs render timing to console:
```
CalendarModule [mount]: actual=12.5ms, base=45.2ms
CalendarModule [update]: actual=2.3ms, base=45.2ms
```

### Option 3: Chrome DevTools Performance

1. Open DevTools → Performance tab
2. Click Record, interact for 5 seconds, Stop
3. Examine:
   - **Scripting time:** JS execution
   - **Rendering time:** Layout/paint
   - **Main thread activity:** Long tasks

---

## Expected Improvements

| Optimization | Expected Impact |
|--------------|-----------------|
| React Compiler | 20-40% fewer re-renders (auto-memoization) |
| O(1) member lookups | Negligible for 5 members, matters at scale |
| Pre-computed eventsByDay | 70× fewer filter operations in monthly view |
| Zustand compound selectors | 5× fewer subscription checks |
| Shared time-utils | Regex compiled once vs per-call |

---

## Verification Checklist

- [ ] React DevTools shows "Memo ✨" on CalendarEventCard, CalendarNavigation, etc.
- [ ] Monthly view renders without calling `getEventsForDay` (function removed)
- [ ] Weekly view `eventsByDay` computed once per filter/navigation change
- [ ] Console shows Profiler output on calendar interactions
- [ ] `npm run build` passes
- [ ] All calendar views render correctly
- [ ] Filter pills toggle correctly
- [ ] Navigation (prev/next/today) works
