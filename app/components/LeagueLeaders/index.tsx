import TeamLogo from "@/app/components/TeamLogo";
import { resizedImageUrl } from "@/app/lib/espn";
import type {
  LeaderCategoryView,
  LeaderRow,
  StandingsLeaders,
} from "@/app/lib/standings/standings-view";
import { strings } from "@/app/lib/strings";

// The largest rendered headshot size, the desktop leader's: ESPN headshots are 1040x760, so this keeps their aspect ratio.
const HEADSHOT_WIDTH = 56;
const HEADSHOT_HEIGHT = 41;
// Requested at twice the display size so headshots stay sharp on high-density screens.
const HEADSHOT_REQUEST_SCALE = 2;
const TEAM_LOGO_SIZE = 14;
const HEADING_ID = "league-leaders";

// The leader of each category gets a larger photo and value than the runners-up, as in the artboards.
const HEADSHOT_CLASS_NAME = {
  leader: "h-9.5 w-13 md:h-10.25 md:w-14",
  runnerUp: "h-5.5 w-7.5 md:h-6 md:w-8",
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

function LeaderListItem({ leader }: { leader: LeaderRow }) {
  const tier = leader.rank === 1 ? "leader" : "runnerUp";
  const headshotClassName = `shrink-0 rounded-lg bg-white/6 object-cover ${HEADSHOT_CLASS_NAME[tier]}`;

  return (
    <li
      className={`-mx-2 flex min-h-9 items-center gap-2.5 rounded-[10px] px-2 py-0.75 md:py-1.25 ${leader.isFavorite ? "bg-favorite/8" : ""}`}
    >
      <span className="w-3 shrink-0 text-[11px] text-muted md:w-3.5">
        {leader.rank}
      </span>
      {leader.headshotUrl ? (
        <img
          src={resizedImageUrl(
            leader.headshotUrl,
            HEADSHOT_WIDTH * HEADSHOT_REQUEST_SCALE,
            HEADSHOT_HEIGHT * HEADSHOT_REQUEST_SCALE,
          )}
          // The name sits next to the photo, so the photo adds nothing for screen readers.
          alt=""
          width={HEADSHOT_WIDTH}
          height={HEADSHOT_HEIGHT}
          loading="lazy"
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
            <TeamLogo logoUrl={leader.teamLogoUrl} size={TEAM_LOGO_SIZE} lazy />
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

function LeaderCategoryCard({ category }: { category: LeaderCategoryView }) {
  const headingId = `${HEADING_ID}-${category.stat}`;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-1 rounded-card border border-white/10 bg-white/4.5 p-3.5 md:gap-1.5 md:p-4"
    >
      <h3
        id={headingId}
        className="mb-1 font-display text-[15px] tracking-[0.14em] text-muted md:text-base"
      >
        {category.title}
      </h3>
      {category.status === "ready" ? (
        <ol className="flex flex-col gap-0.5 md:gap-1">
          {category.leaders.map((leader) => (
            <LeaderListItem key={leader.athleteId} leader={leader} />
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

export default function LeagueLeaders({
  leaders,
}: {
  leaders: StandingsLeaders;
}) {
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
      {leaders.kind === "loading" && (
        <p role="status" className="text-sm text-muted">
          {strings.standings.leaders.loading}
        </p>
      )}
      {leaders.kind === "error" && (
        <p role="alert" className="text-sm text-secondary">
          {strings.leaders.error}
        </p>
      )}
      {leaders.kind === "ready" && (
        <>
          <div className="grid items-start gap-3 md:grid-cols-auto-fill md:gap-4">
            {leaders.categories.map((category) => (
              <LeaderCategoryCard key={category.stat} category={category} />
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
