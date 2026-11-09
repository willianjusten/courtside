import {
  EmptyState,
  RetryableError,
  StaleNotice,
} from "@/components/DataStates";
import TeamLogo from "@/components/TeamLogo";
import { resizedHeadshotUrl } from "@/lib/espn";
import type {
  LeaderCategoryView,
  LeaderRow,
  StandingsLeaders,
} from "@/features/standings/standings-view";
import { strings } from "@/lib/strings";

const TEAM_LOGO_SIZE = 14;
const HEADING_ID = "league-leaders";
// The categories shown before the percentages unlock, so the skeleton matches the early-season grid.
const SKELETON_CATEGORY_COUNT = 6;
const SKELETON_LEADER_COUNT = 5;
const CATEGORY_CARD_CLASS_NAME =
  "flex flex-col gap-1 rounded-card border border-white/10 bg-white/4.5 p-3.5 md:gap-1.5 md:p-4";
const CATEGORY_GRID_CLASS_NAME =
  "grid items-start gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3";

// The leader of each category gets a larger photo and value than the runners-up, as in the artboards.
// The width and height are the desktop ones, the larger: the leader's keep the 1040x760 aspect ratio of ESPN
// headshots, and the runner-ups' crop it slightly to fill their box.
const HEADSHOT = {
  leader: { className: "h-9.5 w-13 md:h-10.25 md:w-14", width: 56, height: 41 },
  runnerUp: { className: "h-5.5 w-7.5 md:h-6 md:w-8", width: 32, height: 24 },
};
const NAME_CLASS_NAME = {
  leader: "text-sm font-bold",
  runnerUp: "text-[13px] font-medium",
};
const VALUE_CLASS_NAME = {
  leader: "text-[26px] text-accent-soft md:text-[28px]",
  runnerUp: "text-lg text-secondary",
};

function FavoriteStar() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label={strings.standings.leaders.favorite}
      className="shrink-0 text-favorite"
    >
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  );
}

function LeaderListItem({
  leader,
  isAboveTheFold,
}: {
  leader: LeaderRow;
  isAboveTheFold: boolean;
}) {
  const tier = leader.rank === 1 ? "leader" : "runnerUp";
  const headshot = HEADSHOT[tier];
  const headshotClassName = `shrink-0 rounded-lg bg-white/6 object-cover ${headshot.className}`;

  return (
    <li
      className={`-mx-2 flex min-h-9 items-center gap-2.5 rounded-[10px] px-2 py-0.75 md:py-1.25 ${leader.isFavorite ? "bg-favorite/8" : ""}`}
    >
      <span className="w-3 shrink-0 text-[11px] text-muted md:w-3.5">
        {leader.rank}
      </span>
      {leader.headshotUrl ? (
        <img
          src={resizedHeadshotUrl(
            leader.headshotUrl,
            headshot.width,
            headshot.height,
          )}
          // The name sits next to the photo, so the photo adds nothing for screen readers.
          alt=""
          width={headshot.width}
          height={headshot.height}
          loading={isAboveTheFold ? undefined : "lazy"}
          className={headshotClassName}
        />
      ) : (
        <span aria-hidden="true" className={headshotClassName} />
      )}
      <span className="flex min-w-0 grow flex-col">
        <span className={`truncate ${NAME_CLASS_NAME[tier]}`}>
          {leader.name}
        </span>
        {leader.teamAbbreviation && (
          <span className="flex items-center gap-1.25 text-[11px] text-muted">
            <TeamLogo
              logoUrl={leader.teamLogoUrl}
              size={TEAM_LOGO_SIZE}
              lazy={!isAboveTheFold}
            />
            {leader.teamAbbreviation}
            {leader.isFavorite && <FavoriteStar />}
          </span>
        )}
      </span>
      <span
        className={`shrink-0 font-display leading-none ${VALUE_CLASS_NAME[tier]}`}
      >
        {leader.value}
      </span>
    </li>
  );
}

function LeaderCategoryCard({
  category,
  isAboveTheFold,
}: {
  category: LeaderCategoryView;
  isAboveTheFold: boolean;
}) {
  const headingId = `${HEADING_ID}-${category.stat}`;

  return (
    <section aria-labelledby={headingId} className={CATEGORY_CARD_CLASS_NAME}>
      <h3
        id={headingId}
        className="mb-1 font-display text-[15px] tracking-[0.14em] text-muted md:text-base"
      >
        {category.title}
      </h3>
      {category.status === "ready" ? (
        <ol className="flex flex-col gap-0.5 md:gap-1">
          {category.leaders.map((leader) => (
            <LeaderListItem
              key={leader.athleteId}
              leader={leader}
              isAboveTheFold={isAboveTheFold}
            />
          ))}
        </ol>
      ) : category.status === "error" ? (
        <p role="alert" className="text-sm text-muted">
          {strings.leaders.categoryError}
        </p>
      ) : (
        <p className="text-sm text-muted">{strings.leaders.empty}</p>
      )}
    </section>
  );
}

function SkeletonLeaderRow({ isLeader }: { isLeader: boolean }) {
  const tier = isLeader ? "leader" : "runnerUp";

  return (
    <div className="flex min-h-9 items-center gap-2.5 py-0.75 md:py-1.25">
      <div className="h-2.5 w-3 shrink-0 rounded-sm bg-white/10 md:w-3.5" />
      <div
        className={`shrink-0 rounded-lg bg-white/10 ${HEADSHOT[tier].className}`}
      />
      <div className="h-3.5 grow rounded-md bg-white/10" />
      <div
        className={`shrink-0 rounded-md bg-white/10 ${isLeader ? "h-6.5 w-11" : "h-4.5 w-8"}`}
      />
    </div>
  );
}

function LeagueLeadersLoading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{strings.standings.leaders.loading}</span>
      <div aria-hidden="true" className={CATEGORY_GRID_CLASS_NAME}>
        {Array.from({ length: SKELETON_CATEGORY_COUNT }, (_, categoryIndex) => (
          <div
            key={categoryIndex}
            className={`animate-shimmer ${CATEGORY_CARD_CLASS_NAME}`}
          >
            <div className="mb-1 h-4 w-32 rounded-md bg-white/10" />
            {Array.from({ length: SKELETON_LEADER_COUNT }, (_, leaderIndex) => (
              <SkeletonLeaderRow
                key={leaderIndex}
                isLeader={leaderIndex === 0}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type LeagueLeadersProps = {
  leaders: StandingsLeaders;
  onRetry: () => void;
  isRetrying: boolean;
  // True when the mobile Leaders view opens the page; elsewhere the leaders sit below the standings.
  isAboveTheFold?: boolean;
};

export default function LeagueLeaders({
  leaders,
  onRetry,
  isRetrying,
  isAboveTheFold = false,
}: LeagueLeadersProps) {
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="flex flex-col gap-3 md:gap-3.5"
    >
      {/* Mobile reaches the leaders through the view switch, which already names them. */}
      <div className="sr-only flex items-baseline justify-between gap-3 md:not-sr-only">
        <h2
          id={HEADING_ID}
          className="font-display text-[22px] tracking-[0.14em]"
        >
          {strings.standings.leaders.title}
        </h2>
        <span className="text-[11px] text-muted">
          {strings.standings.leaders.topFive}
        </span>
      </div>
      {leaders.kind === "loading" && <LeagueLeadersLoading />}
      {leaders.kind === "error" && (
        <RetryableError
          message={strings.leaders.error}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      )}
      {leaders.kind === "empty" && <EmptyState message={leaders.message} />}
      {leaders.kind === "ready" && (
        <>
          {leaders.staleNotice && <StaleNotice message={leaders.staleNotice} />}
          <div className={CATEGORY_GRID_CLASS_NAME}>
            {leaders.categories.map((category) => (
              <LeaderCategoryCard
                key={category.stat}
                category={category}
                isAboveTheFold={isAboveTheFold}
              />
            ))}
          </div>
          {leaders.percentagesNote && (
            <p className="rounded-[14px] border border-dashed border-white/16 px-3.5 py-3 text-xs text-muted">
              {leaders.percentagesNote}
            </p>
          )}
        </>
      )}
    </section>
  );
}
