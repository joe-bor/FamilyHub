import { useState } from "react";
import { usePressable } from "@/hooks/use-pressable";
import type { Feed, FeedGroup, FeedRow } from "@/lib/home-activity/types";
import { cn } from "@/lib/utils";

type MemberColorOf = (memberId: string | undefined) => string | undefined;

interface ActivityFeedProps {
  feed: Feed;
  onSelectRow: (row: FeedRow) => void;
  /** Resolve a member's dot color from its id. Wired from `useFamilyMemberMap` in
   * the dashboard so this component stays presentational/provider-free in tests. */
  memberColorOf?: MemberColorOf;
  /** Bumped on each meaningful open; remounts groups so expansion is ephemeral (§5). */
  meaningfulOpenId?: number;
}

// Shared field styling. min-h-11 = 44px touch target (spec §9). Easing/durations
// from the shipped motion system; motion-reduce collapses to instant (no plugin).
const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

export function ActivityFeed({
  feed,
  onSelectRow,
  memberColorOf,
  meaningfulOpenId = 0,
}: ActivityFeedProps) {
  if (feed.groups.length === 0) {
    return (
      <section className="px-4 pt-6" aria-label="Recent changes">
        <h2 className="text-sm font-medium text-muted-foreground">
          Since you last opened
        </h2>
        <p className="pt-2 text-sm text-muted-foreground">
          You're all caught up.
        </p>
      </section>
    );
  }

  return (
    <section className="px-4 pt-6" aria-label="Recent changes">
      <h2 className="text-sm font-medium text-muted-foreground">
        Since you last opened
      </h2>
      <ul className="pt-2">
        {feed.groups.map((group, index) => (
          <li key={group.id}>
            {/* key includes the epoch so a meaningful open remounts (collapses) the group */}
            <ActivityGroup
              key={`${group.id}:${meaningfulOpenId}`}
              group={group}
              onSelectRow={onSelectRow}
              memberColorOf={memberColorOf}
            />
            {index === feed.dividerAfter && (
              <div className="my-2 flex items-center gap-2 text-xs text-muted-foreground/70">
                <span className="h-px flex-1 bg-border" /> earlier{" "}
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
          </li>
        ))}
      </ul>
      {feed.overflow > 0 && (
        <p className="pt-1 text-xs text-muted-foreground/70">
          and {feed.overflow} more
        </p>
      )}
    </section>
  );
}

function MemberDot({ color }: { color?: string }) {
  if (!color) return null;
  return (
    <span
      aria-hidden
      className="mr-2 inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function ActivityGroup({
  group,
  onSelectRow,
  memberColorOf,
}: {
  group: FeedGroup;
  onSelectRow: (r: FeedRow) => void;
  memberColorOf?: MemberColorOf;
}) {
  const [open, setOpen] = useState(false);
  const press = usePressable();
  const expandable = group.rows.length > 1;

  if (!expandable) {
    const row = group.rows[0];
    return (
      <button
        type="button"
        className={cn(
          press.className,
          "flex min-h-11 w-full items-center justify-between rounded-2xl px-1 py-2 text-left",
        )}
        onPointerDown={press.onPointerDown}
        onClick={() => onSelectRow(row)}
      >
        <span className="flex items-center text-sm">
          <MemberDot color={memberColorOf?.(row.memberId)} />
          {group.summary}
        </span>
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        className={cn(
          press.className,
          "flex min-h-11 w-full items-center justify-between rounded-2xl px-1 py-2 text-left",
        )}
        onPointerDown={press.onPointerDown}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm">{group.summary}</span>
        <span
          aria-hidden
          className={cn(
            "text-muted-foreground transition-transform duration-[250ms] motion-reduce:transition-none",
            EASE,
          )}
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        >
          ▸
        </span>
      </button>
      {/* grid-rows 0fr→1fr animates height under motion-safe; under reduced motion the
          height snaps and only the opacity fades (spec §6 "opacity-only"). When closed
          the sub-list is `inert` + aria-hidden, so it is fully non-interactive and out
          of the a11y tree — not merely untabbable. */}
      <div
        className="grid motion-safe:transition-[grid-template-rows] motion-safe:duration-[250ms] motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <ul
          inert={!open}
          aria-hidden={!open}
          className={cn(
            "overflow-hidden pl-3 transition-opacity duration-[250ms]",
            EASE,
            open ? "opacity-100" : "opacity-0",
          )}
        >
          {group.rows.map((row) => (
            <SubRow
              key={row.storeKey}
              row={row}
              onSelectRow={onSelectRow}
              memberColorOf={memberColorOf}
              tabbable={open}
            />
          ))}
          {group.rowsOverflow > 0 && (
            <li className="px-1 py-2 text-xs text-muted-foreground/70">
              and {group.rowsOverflow} more
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function SubRow({
  row,
  onSelectRow,
  memberColorOf,
  tabbable,
}: {
  row: FeedRow;
  onSelectRow: (r: FeedRow) => void;
  memberColorOf?: MemberColorOf;
  tabbable: boolean;
}) {
  const press = usePressable(); // sub-rows are pressable too (spec §6)
  return (
    <li>
      <button
        type="button"
        tabIndex={tabbable ? 0 : -1}
        className={cn(
          press.className,
          "flex min-h-11 w-full items-center justify-between rounded-xl px-1 py-2 text-left text-sm",
        )}
        onPointerDown={press.onPointerDown}
        onClick={() => onSelectRow(row)}
      >
        <span className="flex items-center">
          <MemberDot color={memberColorOf?.(row.memberId)} />
          {markerFor(row.kind)} {row.label}
        </span>
        {row.detail && (
          <span className="text-muted-foreground">{row.detail}</span>
        )}
      </button>
    </li>
  );
}

function markerFor(kind: FeedRow["kind"]): string {
  return kind === "added" ? "+" : kind === "removed" ? "−" : "~";
}
