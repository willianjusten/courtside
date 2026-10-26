import { strings } from "@/app/lib/strings";

// One conference: the skeleton holds the table's full height so the legend below does not jump.
const SKELETON_ROW_COUNT = 15;
// The record plus the eight stat columns, PCT through DIFF.
const SKELETON_STAT_COUNT = 9;
const SKELETON_BAR_CLASS_NAME = "rounded-md bg-white/10";

// Placeholders for the season label and the conference switch, which wait on the standings.
export function StandingsHeaderSkeleton() {
  return (
    <span
      aria-hidden="true"
      className={`h-3.5 w-28 animate-shimmer md:h-4 md:w-36 ${SKELETON_BAR_CLASS_NAME}`}
    />
  );
}

export function ConferenceSwitchSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-12 animate-shimmer rounded-full border border-white/10 bg-white/5 md:h-13 md:w-44"
    />
  );
}

function SkeletonTableRow() {
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-tile border border-white/7 bg-white/3.5 py-2 pr-2.5 pl-2.5">
      <div className="size-6.5 shrink-0 rounded-[9px] bg-white/10" />
      <div className="size-6.5 shrink-0 rounded-full bg-white/10" />
      <div className={`h-3.5 grow ${SKELETON_BAR_CLASS_NAME}`} />
      {Array.from({ length: SKELETON_STAT_COUNT }, (_, index) => (
        <div
          key={index}
          className={`h-3 w-10 shrink-0 ${SKELETON_BAR_CLASS_NAME}`}
        />
      ))}
    </div>
  );
}

export function StandingsTableLoading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3.5">
      <span className="sr-only">{strings.standings.loading}</span>
      <div
        aria-hidden="true"
        className="overflow-hidden md:card md:border-white/10 md:bg-white/3 md:px-3 md:pt-2 md:pb-2.5"
      >
        {/* The table's minimum widths, so the stat columns run past the edge on mobile as the loaded table's do. */}
        <div className="flex min-w-158 animate-shimmer flex-col gap-1 md:min-w-180">
          {/* Holds the column headers' height. */}
          <div className="h-5" />
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <SkeletonTableRow key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
