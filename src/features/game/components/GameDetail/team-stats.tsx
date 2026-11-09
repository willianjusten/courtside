import type { CSSProperties } from "react";
import type {
  TeamStatRow,
  TeamStatsView,
} from "@/features/game/utils/game-view";
import type { TeamSide } from "@/utils/team-colors";
import { strings } from "@/config/strings";
import { SURFACE_CLASS_NAME } from "@/components/ui/panel-styles";

const HEADING_ID = "game-team-stats";
// Staggers the bars so they grow one row after another, as in the artboards.
const BAR_DELAY_STEP_MS = 70;

function StatValue({
  value,
  isBetter,
  className,
}: {
  value: string;
  isBetter: boolean;
  className: string;
}) {
  const valueClassName = `w-14 shrink-0 font-display text-[19px] leading-none ${className}`;
  return isBetter ? (
    <strong className={`font-normal ${valueClassName}`}>{value}</strong>
  ) : (
    <span className={`text-muted ${valueClassName}`}>{value}</span>
  );
}

function StatBar({
  share,
  color,
  side,
  isDimmed,
  delayMs,
}: {
  share: number;
  color: string;
  side: TeamSide;
  isDimmed: boolean;
  delayMs: number;
}) {
  const style: CSSProperties = {
    width: `${share}%`,
    backgroundColor: color,
    animationDelay: `${delayMs}ms`,
  };
  return (
    <div
      className={`flex grow basis-0 overflow-hidden rounded-full bg-white/7 ${side === "away" ? "justify-end" : ""}`}
    >
      <div
        className={`h-full animate-grow-bar rounded-full ${side === "away" ? "origin-right" : "origin-left"} ${isDimmed ? "opacity-45" : ""}`}
        style={style}
      />
    </div>
  );
}

function StatRow({
  row,
  teamStats,
  index,
}: {
  row: TeamStatRow;
  teamStats: TeamStatsView;
  index: number;
}) {
  const delayMs = index * BAR_DELAY_STEP_MS;
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <StatValue
          value={row.away}
          isBetter={row.betterSide === "away"}
          className="text-left"
        />
        <span className="text-center text-[10px] tracking-[0.16em] text-muted uppercase">
          {row.label}
        </span>
        <StatValue
          value={row.home}
          isBetter={row.betterSide === "home"}
          className="text-right"
        />
      </div>
      <div aria-hidden="true" className="flex h-1.5 gap-1">
        <StatBar
          side="away"
          share={row.awayShare}
          color={teamStats.away.color}
          isDimmed={row.betterSide === "home"}
          delayMs={delayMs}
        />
        <StatBar
          side="home"
          share={row.homeShare}
          color={teamStats.home.color}
          isDimmed={row.betterSide === "away"}
          delayMs={delayMs}
        />
      </div>
    </li>
  );
}

export function TeamStats({ teamStats }: { teamStats: TeamStatsView | null }) {
  return (
    <section
      aria-labelledby={HEADING_ID}
      className={`flex min-w-0 flex-col gap-3.5 p-3.5 md:px-[18px] md:py-8 ${SURFACE_CLASS_NAME}`}
    >
      {/* The heading sits between the teams' abbreviations, as in the artboards. */}
      <div className="flex items-baseline justify-between font-display text-[15px] tracking-[0.14em] md:text-base">
        {teamStats && (
          <span style={{ color: teamStats.away.color }}>
            {teamStats.away.abbreviation}
          </span>
        )}
        <h2 id={HEADING_ID} className="text-muted uppercase">
          {strings.game.teamStats.title}
        </h2>
        {teamStats && (
          <span style={{ color: teamStats.home.color }}>
            {teamStats.home.abbreviation}
          </span>
        )}
      </div>
      {teamStats ? (
        // On desktop the card stretches to the box score beside it, so the rows spread over its height.
        <ul className="flex flex-col gap-3.5 md:grow md:justify-between">
          {teamStats.rows.map((row, index) => (
            <StatRow
              key={row.stat}
              row={row}
              teamStats={teamStats}
              index={index}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{strings.game.teamStats.empty}</p>
      )}
    </section>
  );
}
