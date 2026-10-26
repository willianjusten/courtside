import { FOCUS_RING_CLASS_NAME } from "@/app/components/DatePicker/DatePickerTrigger";
import TeamLogo from "@/app/components/TeamLogo";
import type { StandingsZone } from "@/app/lib/standings/standings-view";
import type { StreakKind } from "@/app/lib/standings/streak";
import { strings } from "@/app/lib/strings";
import type {
  TeamFollow,
  TeamReadyScreen,
  TeamTile,
} from "@/app/lib/team/team-view";
import { TeamTilesLoading } from "./states";

const LOGO_SIZE = 120;

const CHIP_CLASS_NAME =
  "rounded-full px-2.25 py-1 text-[11px] font-bold md:px-3 md:py-1.5 md:text-[13px]";

const ZONE_CHIP_CLASS_NAME: Record<StandingsZone, string> = {
  playoff: "border border-playoff/45 bg-playoff/18 text-playoff-soft",
  "play-in": "border border-play-in/42 bg-play-in/16 text-play-in-soft",
  none: "bg-white/8",
};

const STREAK_CHIP_CLASS_NAME: Record<StreakKind, string> = {
  win: "border border-win/40 bg-win/14 text-win-soft",
  loss: "border border-loss/40 bg-loss/14 text-loss",
};

function Chip({
  className = "bg-white/8",
  children,
}: {
  className?: string;
  children: string;
}) {
  return <span className={`${CHIP_CLASS_NAME} ${className}`}>{children}</span>;
}

// Decorative only, so it takes the team's raw shade alongside the readable accent.
export function TeamGlow({ screen }: { screen: TeamReadyScreen }) {
  const { accent, shade } = screen.header.colors;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -top-48 -right-38 size-110 rounded-full opacity-20 md:-top-80 md:-right-40 md:size-225"
      style={{
        background: `radial-gradient(circle, ${accent} 0%, ${shade} 45%, transparent 72%)`,
      }}
    />
  );
}

function FollowButton({
  follow,
  onToggleFollow,
}: {
  follow: TeamFollow;
  onToggleFollow: () => void;
}) {
  const toneClassName = follow.isFollowing
    ? "border-favorite/50 bg-favorite/14 text-favorite-soft"
    : "border-white/16 bg-white/6 text-foreground hover:bg-white/10";

  return (
    <button
      type="button"
      aria-pressed={follow.isFollowing}
      onClick={onToggleFollow}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-1.75 rounded-full border px-4 text-[13px] font-bold transition-colors md:min-h-12 md:gap-2 md:px-5.5 md:text-sm ${FOCUS_RING_CLASS_NAME} ${toneClassName}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        strokeWidth="1.8"
        strokeLinejoin="round"
        className={`size-4 shrink-0 stroke-favorite md:size-4.5 ${follow.isFollowing ? "fill-favorite" : "fill-none"}`}
      >
        <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
      </svg>
      {follow.label}
    </button>
  );
}

// Mobile only: desktop sums up the home and away records in a header chip.
function TeamTiles({ tiles }: { tiles: TeamTile[] }) {
  return (
    <dl
      aria-label={strings.team.tiles.label}
      className="grid grid-cols-3 gap-2 md:hidden"
    >
      {tiles.map((tile) => (
        <div
          key={tile.id}
          className="flex flex-col rounded-[13px] border border-white/9 bg-white/5 px-3 py-2.5"
        >
          <dt className="text-[9px] tracking-[0.14em] text-muted uppercase">
            {tile.label}
          </dt>
          <dd className="font-display text-xl leading-tight">{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TeamHeader({
  screen,
  onToggleFollow,
}: {
  screen: TeamReadyScreen;
  onToggleFollow: () => void;
}) {
  const { header, follow, tiles, areTilesLoading, homeAwayLabel } = screen;

  return (
    <div className="relative flex flex-col gap-3.5 md:gap-0">
      <header className="flex flex-wrap items-center gap-3.5 md:gap-6">
        {/* The mobile artboard puts the button in the top bar, so it takes a row of its own above a long team name. */}
        <div className="order-first flex basis-full justify-end md:order-last md:ml-auto md:basis-auto">
          <FollowButton follow={follow} onToggleFollow={onToggleFollow} />
        </div>
        {/* One logo at the desktop size, shrunk on mobile, so the browser loads a single image. */}
        <span className="shrink-0 *:size-18 md:*:size-30">
          <TeamLogo logoUrl={header.logoUrl} size={LOGO_SIZE} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5 md:gap-1.5">
          <p className="text-[11px] tracking-[0.18em] text-muted uppercase md:text-[13px] md:tracking-[0.2em]">
            <span>{header.location}</span>
            {header.conferenceName && (
              <span className="hidden md:inline">
                {strings.team.eyebrowSeparator}
                {header.conferenceName}
              </span>
            )}
          </p>
          <h1 className="font-display text-4xl leading-[0.95] uppercase md:text-7xl md:leading-[0.9]">
            <span className="sr-only">{header.displayName}</span>
            <span aria-hidden="true">{header.name}</span>
          </h1>
          <div className="mt-1 flex flex-wrap gap-1.5 md:mt-1.5 md:gap-2">
            {header.record && <Chip>{header.record}</Chip>}
            {header.rankLabel && header.zone && (
              <Chip className={ZONE_CHIP_CLASS_NAME[header.zone]}>
                {header.rankLabel}
              </Chip>
            )}
            {header.streak && header.streakKind && (
              <Chip className={STREAK_CHIP_CLASS_NAME[header.streakKind]}>
                {header.streak}
              </Chip>
            )}
            {homeAwayLabel && (
              <Chip className="hidden bg-white/5 font-normal text-secondary md:inline">
                {homeAwayLabel}
              </Chip>
            )}
          </div>
        </div>
      </header>
      {tiles && <TeamTiles tiles={tiles} />}
      {areTilesLoading && <TeamTilesLoading />}
    </div>
  );
}
