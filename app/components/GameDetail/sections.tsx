import type { ReactNode } from "react";
import type { Game, Team } from "@/app/lib/domain/game";
import type {
  GameLeader,
  GameSide,
  Play,
  WinProbabilityPoint,
} from "@/app/lib/domain/game-summary";
import { strings } from "@/app/lib/strings";
import { periodLabel } from "@/app/lib/game/status";
import { SURFACE_CLASS_NAME, TILE_CLASS_NAME } from "./styles";

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

export function Section({
  headingId,
  title,
  action,
  children,
}: {
  headingId: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const heading = (
    <h2
      id={headingId}
      className="font-display text-base tracking-[0.18em] text-muted uppercase md:text-lg"
    >
      {title}
    </h2>
  );

  return (
    <section
      aria-labelledby={headingId}
      className={`flex min-w-0 flex-col gap-3 p-3.5 md:p-[18px] ${SURFACE_CLASS_NAME}`}
    >
      {action ? (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {heading}
          {action}
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  );
}

// Holds a section's slot in the layout until its own ticket fills it.
export function PendingSection({
  headingId,
  title,
  note,
}: {
  headingId: string;
  title: string;
  note: string;
}) {
  return (
    <Section headingId={headingId} title={title}>
      <p className="text-sm text-muted">{note}</p>
    </Section>
  );
}

function TeamLeaders({ team, leaders }: { team: Team; leaders: GameLeader[] }) {
  return (
    <div className={`flex flex-col gap-2 ${TILE_CLASS_NAME}`}>
      <h3 className="font-bold">{team.displayName}</h3>
      {leaders.length === 0 ? (
        <p className="text-sm text-muted">{strings.game.leaders.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {leaders.map(({ stat, leader }) => (
            <li key={stat} className="flex gap-2">
              <span className="w-24 text-muted">
                {strings.leaders.categories[stat].title}
              </span>
              <span className="grow font-medium">
                {leader.athlete.displayName}
              </span>
              <span className="tabular-nums">{leader.displayValue}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GameLeaders({
  game,
  leaders,
}: {
  game: Game;
  leaders: GameSide<GameLeader[]>;
}) {
  return (
    <Section headingId="game-leaders" title={strings.game.leaders.title}>
      <div className="grid gap-3">
        <TeamLeaders team={game.away.team} leaders={leaders.away} />
        <TeamLeaders team={game.home.team} leaders={leaders.home} />
      </div>
    </Section>
  );
}

export function WinProbability({
  game,
  points,
}: {
  game: Game;
  points: WinProbabilityPoint[];
}) {
  const latestPoint = points.at(-1);

  return (
    <Section
      headingId="game-win-probability"
      title={strings.game.winProbability.title}
    >
      {latestPoint ? (
        <div className={`flex flex-col gap-2 text-sm ${TILE_CLASS_NAME}`}>
          <p className="flex justify-between tabular-nums">
            <span>
              {strings.game.winProbability.chance(
                game.away.team.abbreviation,
                percentFormatter.format(1 - latestPoint.homeWinPercentage),
              )}
            </span>
            <span>
              {strings.game.winProbability.chance(
                game.home.team.abbreviation,
                percentFormatter.format(latestPoint.homeWinPercentage),
              )}
            </span>
          </p>
        </div>
      ) : (
        <p className="text-muted">{strings.game.winProbability.empty}</p>
      )}
    </Section>
  );
}

export function PlayByPlay({ game, plays }: { game: Game; plays: Play[] }) {
  const abbreviationByTeamId = new Map(
    [game.home.team, game.away.team].map((team) => [
      team.id,
      team.abbreviation,
    ]),
  );

  return (
    <Section headingId="game-plays" title={strings.game.plays.title}>
      {plays.length === 0 ? (
        <p className="text-muted">{strings.game.plays.empty}</p>
      ) : (
        // Newest first, so a live game's latest plays are on top.
        <ol reversed className="flex flex-col-reverse gap-1 text-sm">
          {plays.map((play) => (
            <li
              key={play.id}
              className={`flex gap-3 rounded px-2 py-1 ${play.scoringPlay ? "bg-white/5" : ""}`}
            >
              <span className="w-16 shrink-0 text-muted tabular-nums">
                {periodLabel(play.period)} {play.clock}
              </span>
              <span className="w-10 shrink-0 text-muted">
                {play.teamId ? abbreviationByTeamId.get(play.teamId) : ""}
              </span>
              <span className="grow">{play.text}</span>
              <span className="shrink-0 tabular-nums">
                {strings.game.plays.score(play.awayScore, play.homeScore)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
