import type { GameLeaderStat } from "@/app/lib/domain/leaders";
import { resizedImageUrl } from "@/app/lib/espn";
import type {
  GameLeaderAthlete,
  GameLeaderRow,
  GameLeadersView,
} from "@/app/lib/game/game-view";
import { strings } from "@/app/lib/strings";
import { Section } from "./sections";

// ESPN headshots are 1040x760, so this keeps their aspect ratio.
const HEADSHOT_DISPLAY_WIDTH = 48;
const HEADSHOT_DISPLAY_HEIGHT = 35;
// Requested at twice the display size so headshots stay sharp on high-density screens.
const HEADSHOT_REQUEST_SCALE = 2;
const HEADSHOT_CLASS_NAME = "shrink-0 rounded-lg bg-white/6 object-cover";

// The stat tints of the artboards: accent orange for points, playoff blue for rebounds, win green for assists.
const LEADER_TONE_CLASS_NAMES: Record<
  GameLeaderStat,
  { tile: string; label: string }
> = {
  points: {
    tile: "border-accent/30 bg-accent/10",
    label: "text-accent-soft",
  },
  rebounds: {
    tile: "border-playoff/30 bg-playoff/10",
    label: "text-playoff-soft",
  },
  assists: {
    tile: "border-win/28 bg-win/8",
    label: "text-win-soft",
  },
};

function Headshot({ athlete }: { athlete: GameLeaderAthlete }) {
  return athlete.headshotUrl ? (
    <img
      src={resizedImageUrl(
        athlete.headshotUrl,
        HEADSHOT_DISPLAY_WIDTH * HEADSHOT_REQUEST_SCALE,
        HEADSHOT_DISPLAY_HEIGHT * HEADSHOT_REQUEST_SCALE,
      )}
      alt={athlete.name}
      width={HEADSHOT_DISPLAY_WIDTH}
      height={HEADSHOT_DISPLAY_HEIGHT}
      loading="lazy"
      className={HEADSHOT_CLASS_NAME}
    />
  ) : (
    <span
      aria-hidden="true"
      className={HEADSHOT_CLASS_NAME}
      style={{
        width: HEADSHOT_DISPLAY_WIDTH,
        height: HEADSHOT_DISPLAY_HEIGHT,
      }}
    />
  );
}

function LeaderTile({ leader }: { leader: GameLeaderRow }) {
  const tone = LEADER_TONE_CLASS_NAMES[leader.stat];

  return (
    <li
      className={`flex items-center gap-3 rounded-tile border px-6 py-2.5 ${tone.tile}`}
    >
      {/* Tied leaders stack their headshots, as their names stack beside them. */}
      <span className="flex shrink-0 flex-col gap-1">
        {leader.athletes.map((athlete) => (
          <Headshot key={athlete.name} athlete={athlete} />
        ))}
      </span>
      <span className="flex min-w-0 grow flex-col">
        <span
          className={`text-[9px] tracking-[0.16em] uppercase ${tone.label}`}
        >
          {leader.label}
        </span>
        {leader.athletes.map((athlete) => (
          <span key={athlete.name} className="truncate text-[13px]">
            {strings.game.leaders.athlete(
              athlete.name,
              athlete.teamAbbreviation,
            )}
          </span>
        ))}
      </span>
      <span className="font-display text-[30px] leading-none">
        {leader.value}
      </span>
    </li>
  );
}

export function GameLeaders({ leaders }: { leaders: GameLeadersView | null }) {
  return (
    <Section
      headingId="game-leaders"
      title={strings.game.leaders.title}
      // The top padding stays, so the heading lines up with the box score's beside it.
      className="md:pb-6"
    >
      {leaders ? (
        <ul className="flex flex-col gap-2">
          {leaders.leaders.map((leader) => (
            <LeaderTile key={leader.stat} leader={leader} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{strings.game.leaders.empty}</p>
      )}
    </Section>
  );
}
