import { strings } from "@/config/strings";
import { PANEL_SURFACE_CLASS_NAME } from "@/components/ui/panel-styles";

const STANDINGS_ROW_COUNT = 5;
const LEADER_ROW_COUNT = 3;
const SKELETON_BAR_CLASS_NAME = "rounded-md bg-white/10";

function SkeletonHeading() {
  return <div className={`h-4.5 w-32 ${SKELETON_BAR_CLASS_NAME}`} />;
}

function SkeletonStandingsRow() {
  return (
    <div className="grid min-h-11 grid-cols-[24px_1fr_52px_44px] items-center gap-2 px-1.5 py-0.5">
      <div className="size-6 rounded-lg bg-white/10" />
      <div className="flex items-center gap-2">
        <div className="size-5.5 shrink-0 rounded-full bg-white/10" />
        <div className={`h-3.5 grow ${SKELETON_BAR_CLASS_NAME}`} />
      </div>
      <div className={`ml-auto h-4 w-8 ${SKELETON_BAR_CLASS_NAME}`} />
      <div className={`ml-auto h-3 w-6 ${SKELETON_BAR_CLASS_NAME}`} />
    </div>
  );
}

function SkeletonLeaderRow() {
  return (
    <div className="flex items-center gap-3 border-t border-white/7 pt-3">
      <div className="h-10.25 w-14 shrink-0 rounded-[10px] bg-white/10" />
      <div className="flex grow flex-col gap-1.5">
        <div className={`h-2.5 w-20 ${SKELETON_BAR_CLASS_NAME}`} />
        <div className={`h-3.5 w-28 ${SKELETON_BAR_CLASS_NAME}`} />
        <div className={`h-2.5 w-24 ${SKELETON_BAR_CLASS_NAME}`} />
      </div>
      <div className={`h-7 w-11 ${SKELETON_BAR_CLASS_NAME}`} />
    </div>
  );
}

// Holds the sidebar's shape while it streams in, so the panels do not pop in beside the games.
export function HomeSidebarLoading() {
  return (
    <aside
      role="status"
      aria-busy="true"
      className="hidden flex-col gap-4 lg:flex"
    >
      <span className="sr-only">{strings.home.sidebar.loading}</span>
      <div
        aria-hidden="true"
        className={`flex animate-shimmer flex-col gap-3 ${PANEL_SURFACE_CLASS_NAME}`}
      >
        <SkeletonHeading />
        <div className="flex flex-col">
          {Array.from({ length: STANDINGS_ROW_COUNT }, (_, index) => (
            <SkeletonStandingsRow key={index} />
          ))}
        </div>
      </div>
      <div
        aria-hidden="true"
        className={`flex animate-shimmer flex-col gap-3.5 ${PANEL_SURFACE_CLASS_NAME}`}
      >
        <SkeletonHeading />
        {Array.from({ length: LEADER_ROW_COUNT }, (_, index) => (
          <SkeletonLeaderRow key={index} />
        ))}
      </div>
    </aside>
  );
}
