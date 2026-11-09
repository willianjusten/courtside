import { PANEL_SURFACE_CLASS_NAME } from "@/components/ui/panel-styles";
import { strings } from "@/config/strings";

// Each schedule list opens on four games, as the loaded lists do.
const SCHEDULE_SKELETON_ROW_COUNT = 4;
const SCHEDULE_SKELETON_SECTION_COUNT = 2;
// About a full NBA roster, so the column does not jump when the players arrive.
const ROSTER_SKELETON_ROW_COUNT = 15;
const TILE_SKELETON_COUNT = 3;
// Points, rebounds, and assists.
const LEADERS_SKELETON_ROW_COUNT = 3;
const SKELETON_BAR_CLASS_NAME = "rounded-md bg-white/10";

function SkeletonBar({ className }: { className: string }) {
  return <div className={`${SKELETON_BAR_CLASS_NAME} ${className}`} />;
}

// Holds the header's place, with the Follow button, logo, name, chips, and the mobile tiles.
export function TeamHeaderLoading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3.5">
      <span className="sr-only">{strings.team.loading}</span>
      <div
        aria-hidden="true"
        className="flex animate-shimmer flex-wrap items-center gap-3.5 md:gap-6"
      >
        <div className="order-first flex basis-full justify-end md:order-last md:ml-auto md:basis-auto">
          <div className="h-11 w-28 rounded-full bg-white/8 md:h-12 md:w-36" />
        </div>
        <div className="size-18 shrink-0 rounded-full bg-white/8 md:size-30" />
        <div className="flex grow flex-col gap-2 md:gap-3">
          <SkeletonBar className="h-3 w-24 md:w-40" />
          <SkeletonBar className="h-8 w-44 md:h-16 md:w-96" />
          <div className="flex gap-1.5 md:gap-2">
            <div className="h-6 w-12 rounded-full bg-white/8 md:h-8 md:w-16" />
            <div className="h-6 w-16 rounded-full bg-white/8 md:h-8 md:w-24" />
            <div className="h-6 w-10 rounded-full bg-white/8 md:h-8 md:w-14" />
          </div>
        </div>
      </div>
      <TeamTilesLoading />
    </div>
  );
}

// Mobile only, as the loaded tiles are.
export function TeamTilesLoading() {
  return (
    <div
      aria-hidden="true"
      className="grid animate-shimmer grid-cols-3 gap-2 md:hidden"
    >
      {Array.from({ length: TILE_SKELETON_COUNT }, (_, index) => (
        <div
          key={index}
          className="h-15 rounded-[13px] border border-white/9 bg-white/5"
        />
      ))}
    </div>
  );
}

function ScheduleSkeletonRow() {
  return (
    <div className="grid min-h-14 grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[14px] border border-white/7 bg-white/3.5 px-3 py-2.5 lg:grid-cols-[110px_minmax(0,1fr)_auto] lg:gap-4 lg:px-3.5">
      <SkeletonBar className="h-7 w-11" />
      <div className="flex items-center gap-2">
        <div className="size-7 shrink-0 rounded-full bg-white/10" />
        <SkeletonBar className="h-3.5 w-24 md:w-36" />
      </div>
      <SkeletonBar className="h-3.5 w-14" />
    </div>
  );
}

// The Up next and Results lists, as panels from md up like the loaded schedule.
export function TeamScheduleLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex flex-col gap-4 md:gap-5"
    >
      <span className="sr-only">{strings.team.schedule.loading}</span>
      {Array.from({ length: SCHEDULE_SKELETON_SECTION_COUNT }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="flex animate-shimmer flex-col gap-1.5 md:card md:gap-2.5 md:border-white/10 md:bg-white/4.5 md:p-5"
        >
          <SkeletonBar className="my-1 h-4.5 w-24" />
          {Array.from(
            { length: SCHEDULE_SKELETON_ROW_COUNT },
            (_, rowIndex) => (
              <ScheduleSkeletonRow key={rowIndex} />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

export function TeamRosterLoading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{strings.team.roster.loading}</span>
      <div
        aria-hidden="true"
        className={`flex animate-shimmer flex-col gap-2 ${PANEL_SURFACE_CLASS_NAME}`}
      >
        <SkeletonBar className="h-4.5 w-20" />
        {/* Holds the column headers' height. */}
        <div className="h-6" />
        {Array.from({ length: ROSTER_SKELETON_ROW_COUNT }, (_, index) => (
          <div key={index} className="flex min-h-10 items-center gap-3">
            <SkeletonBar className="h-3 w-5 shrink-0" />
            <SkeletonBar className="h-6 w-8 shrink-0" />
            <SkeletonBar className="h-3.5 grow" />
            <SkeletonBar className="h-3 w-8 shrink-0" />
            <SkeletonBar className="h-3 w-6 shrink-0" />
            <SkeletonBar className="h-3 w-10 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Matches the leaders panel rows: photo, category, name, runners-up, and value.
export function TeamLeadersLoading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{strings.team.leaders.loading}</span>
      <div
        aria-hidden="true"
        className={`flex animate-shimmer flex-col gap-3.5 ${PANEL_SURFACE_CLASS_NAME}`}
      >
        <SkeletonBar className="h-4.5 w-32" />
        {Array.from({ length: LEADERS_SKELETON_ROW_COUNT }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-t border-white/7 pt-3"
          >
            <div className="h-10.25 w-14 shrink-0 rounded-[10px] bg-white/10" />
            <div className="flex grow flex-col gap-1.5">
              <SkeletonBar className="h-2.5 w-20" />
              <SkeletonBar className="h-3.5 w-28" />
              <SkeletonBar className="h-2.5 w-24" />
            </div>
            <SkeletonBar className="h-7 w-11" />
          </div>
        ))}
      </div>
    </div>
  );
}
