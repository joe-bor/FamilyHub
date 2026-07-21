/**
 * Month cell geometry at lg+. Capacity is counted in *slots*, not events:
 * `planCellSlots` can reserve a slot that holds no event so that a multi-day
 * run keeps the same vertical position across the cells it touches.
 *
 * These constants are tunable at the screenshot gate, in the same way
 * DENSE_HOUR_ROW_HEIGHT was tuned for the shipped Week view — with one
 * exception: MONTH_CHIP_HEIGHT is a visual floor, not a dial. The cell is the
 * interactive target; dense slots are presentational. See spec Section 7.
 */

/** Two 1px cell borders. */
export const MONTH_CELL_BORDER_Y = 2;
/** Two 4px vertical paddings; the cell renders this exact value. */
export const MONTH_CELL_PADDING_Y = 8;
/** Fixed date-numeral/header row; the cell renders this exact height. */
export const MONTH_NUMERAL_BLOCK = 20;
/** Gap between the header row and the first visual slot. */
export const MONTH_HEADER_SLOT_GAP = 2;
/**
 * Visual slot height floor. Chips and the `+N` summary are not controls; the
 * 96px-or-taller gridcell is the one >=44px target and opens the popover.
 */
export const MONTH_CHIP_HEIGHT = 28;
/** Vertical gap between chips. */
export const MONTH_CHIP_GAP = 2;
/** Row height floor; guarantees monthSlotCapacity() >= 2. */
export const MONTH_MIN_ROW_HEIGHT = 96;
/** Vertical gap between week rows; adjacent targets require at least 8px. */
export const MONTH_ROW_GAP = 8;
/** Horizontal gap between day columns; adjacent targets require at least 8px. */
export const MONTH_COLUMN_GAP = 8;
/** Horizontal padding inside a day cell. */
export const MONTH_CELL_PADDING_X = 4;
/** One horizontal border plus padding plus half the inter-cell gap. */
export const MONTH_CHIP_BLEED_X =
  1 + MONTH_CELL_PADDING_X + MONTH_COLUMN_GAP / 2;

/**
 * Row height for `weekCount` rows inside `containerHeight` px.
 *
 * `containerHeight` must be the height of the **weeks container**, not the
 * whole grid — the weekday header sits outside it. `rowGap` accounts for the
 * `weekCount - 1` gaps between rows; omitting it overflows the container.
 */
export function monthRowHeight(
  containerHeight: number,
  weekCount: number,
  rowGap = 0,
): number {
  if (weekCount <= 0) return MONTH_MIN_ROW_HEIGHT;
  const available = containerHeight - rowGap * (weekCount - 1);
  return Math.max(MONTH_MIN_ROW_HEIGHT, Math.floor(available / weekCount));
}

/** How many chip-sized slots fit in a cell of the given row height. */
export function monthSlotCapacity(rowHeight: number): number {
  const usable =
    rowHeight -
    MONTH_CELL_BORDER_Y -
    MONTH_CELL_PADDING_Y -
    MONTH_NUMERAL_BLOCK -
    MONTH_HEADER_SLOT_GAP;
  if (usable <= 0) return 0;
  return Math.max(
    0,
    Math.floor(
      (usable + MONTH_CHIP_GAP) / (MONTH_CHIP_HEIGHT + MONTH_CHIP_GAP),
    ),
  );
}
