# Calendar Performance Baseline

**Date:** December 22, 2024
**Branch:** `perf/calendar-rendering-optimization`

## Test Environment

- **Device:** [Your device]
- **Browser:** Chrome [version]
- **React Version:** 19.2.0
- **React Compiler:** Not enabled (baseline)

## Measurement Methodology

1. **React DevTools Profiler** - Record interactions, measure render counts and durations
2. **Chrome DevTools Performance** - Record 5-second traces
3. **`<Profiler>` component** - Programmatic render timing

## Baseline Metrics

### Daily View

| Metric | Value | Notes |
|--------|-------|-------|
| Initial mount | ms | |
| Navigation (prev/next) | ms | |
| Filter toggle | ms | |
| CalendarEventCard renders | count | Per navigation |

### Weekly View

| Metric | Value | Notes |
|--------|-------|-------|
| Initial mount | ms | |
| Navigation (prev/next) | ms | |
| Filter toggle | ms | |
| CalendarEventCard renders | count | Per navigation |
| getEventsForDay() calls | 14 | Per render (7 headers + 7 columns) |

### Monthly View

| Metric | Value | Notes |
|--------|-------|-------|
| Initial mount | ms | |
| Navigation (prev/next) | ms | |
| Filter toggle | ms | |
| getEventsForDay() calls | ~70 | Per render (35 days × 2) |

### Schedule View

| Metric | Value | Notes |
|--------|-------|-------|
| Initial mount | ms | |
| Navigation (prev/next) | ms | |
| Filter toggle | ms | |
| getGroupedEvents() calls | 1 | But iterates 14 days internally |

## Known Issues (Pre-optimization)

1. **CalendarEventCard not memoized** - Re-renders on every parent update
2. **O(n) family member lookups** - `familyMembers.find()` called per event
3. **Duplicate parseTime()** - Regex compiled on every call in daily/weekly views
4. **Multiple Zustand subscriptions** - 10 separate `useCalendarStore()` calls in CalendarModule
5. **Redundant filtering** - getEventsForDay() called 14x (weekly) or 70x (monthly) per render

---

## Post-Optimization Metrics

_To be filled in after optimizations are complete._

### After React Compiler (Commit 1)

| View | Mount | Navigation | Filter Toggle | Improvement |
|------|-------|------------|---------------|-------------|
| Daily | ms | ms | ms | % |
| Weekly | ms | ms | ms | % |
| Monthly | ms | ms | ms | % |
| Schedule | ms | ms | ms | % |

### After All Optimizations (Commit 6)

| View | Mount | Navigation | Filter Toggle | Total Improvement |
|------|-------|------------|---------------|-------------------|
| Daily | ms | ms | ms | % |
| Weekly | ms | ms | ms | % |
| Monthly | ms | ms | ms | % |
| Schedule | ms | ms | ms | % |

## Summary

| Optimization | Impact |
|--------------|--------|
| React Compiler | % improvement |
| O(1) member lookups | % improvement |
| Pre-computed eventsByDay | % improvement |
| Zustand compound selectors | % improvement |
| **Total** | **% improvement** |
