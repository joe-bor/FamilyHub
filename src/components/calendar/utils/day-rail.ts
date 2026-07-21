/** Fixed rail width when shown (spec Section 4.2, ~300px). Tunable in the screenshot gate. */
export const RAIL_WIDTH = 300;
/** Minimum comfortable member-lane width before the rail yields its space back. */
export const MIN_LANE_WIDTH = 190;
/** Time-axis gutter width (matches the `w-16` axis = 64px). */
export const TIME_AXIS_WIDTH = 64;
/**
 * Persistent desktop module-nav rail (`NavigationTabs`, `w-20` = 80px, rendered
 * `{!isMobile && <NavigationTabs/>}` in `App.tsx`) sits left of the calendar, so
 * the calendar's content box is `viewport - 80`. The threshold must include it.
 */
export const DESKTOP_NAV_WIDTH = 80;
/** Slack for lane borders/padding so the threshold is not razor-thin. */
export const RAIL_LAYOUT_SLACK = 48;

/**
 * Minimum viewport width at which the mini-month rail can appear for a family
 * of `memberCount`: desktop nav + time axis + lanes + rail + slack.
 */
export function railThresholdPx(memberCount: number): number {
  return (
    DESKTOP_NAV_WIDTH +
    TIME_AXIS_WIDTH +
    MIN_LANE_WIDTH * Math.max(memberCount, 1) +
    RAIL_WIDTH +
    RAIL_LAYOUT_SLACK
  );
}
