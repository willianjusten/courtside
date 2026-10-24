import Link from "next/link";
import type { ReactNode } from "react";
import { FOCUS_RING_CLASS_NAME } from "@/app/components/DatePicker/DatePickerTrigger";
import GameStatusChip from "@/app/components/StatusChip";
import TeamLogo from "@/app/components/TeamLogo";
import type {
  GameHeader as GameHeaderView,
  HeaderTeam,
  LineScoreView,
} from "@/app/lib/game/game-view";
import { isInProgress } from "@/app/lib/game/status";
import type { TeamSide } from "@/app/lib/home/team-colors";
import { strings } from "@/app/lib/strings";

const HEADER_LOGO_SIZE = 56;
const SCORE_CLASS_NAME = "font-display text-[52px] leading-[0.9] md:text-7xl";

function TeamLink({ team, side }: { team: HeaderTeam; side: TeamSide }) {
  const alignClassName =
    side === "away"
      ? "md:flex-row md:justify-start md:text-left"
      : "md:flex-row-reverse md:justify-start md:text-right";

  return (
    <Link
      href={team.href}
      className={`flex min-w-0 grow basis-0 flex-col items-center gap-1.5 rounded-tile text-center ${alignClassName} ${team.isDimmed ? "opacity-70" : ""} ${FOCUS_RING_CLASS_NAME}`}
    >
      <TeamLogo logoUrl={team.logoUrl} size={HEADER_LOGO_SIZE} />
      <span className="flex min-w-0 flex-col">
        <span className="sr-only">{team.displayName}</span>
        <span
          aria-hidden="true"
          className="font-display text-lg leading-none tracking-[0.05em] uppercase md:text-3xl"
        >
          {team.name}
        </span>
        <span className="text-meta text-muted">{team.recordLabel}</span>
      </span>
    </Link>
  );
}

function Score({ team, isLive }: { team: HeaderTeam; isLive: boolean }) {
  const colorClassName =
    isLive && team.isLeading ? "text-link" : team.isDimmed ? "text-muted" : "";

  return (
    <span className={`${SCORE_CLASS_NAME} ${colorClassName}`}>
      <span className="sr-only">{team.abbreviation} </span>
      {team.score}
    </span>
  );
}

function Scoreboard({ header }: { header: GameHeaderView }) {
  const { away, home, status } = header;
  if (away.score === null || home.score === null) {
    return (
      <span className="font-display text-2xl text-muted">
        {strings.gameCard.at}
      </span>
    );
  }

  const isLive = isInProgress(status);
  return (
    <div className="flex items-baseline gap-2.5 md:gap-4">
      <Score team={away} isLive={isLive} />
      <span
        aria-hidden="true"
        className="font-display text-2xl text-muted md:text-3xl"
      >
        —
      </span>
      <Score team={home} isLive={isLive} />
    </div>
  );
}

function StatusLine({ header }: { header: GameHeaderView }) {
  const { status, statusLabel, startTime } = header;
  const isLive = isInProgress(status);

  return (
    <div className="flex items-center gap-2">
      <GameStatusChip
        status={status}
        label={statusLabel}
        startTime={startTime}
      />
      {isLive && (
        <span className="text-meta font-medium text-secondary">
          {statusLabel}
        </span>
      )}
    </div>
  );
}

export function GameHeader({
  header,
  children,
}: {
  header: GameHeaderView;
  children?: ReactNode;
}) {
  return (
    <section
      aria-labelledby="game-title"
      className="flex flex-col gap-4 card p-4 md:px-7 md:py-6"
    >
      <h1 id="game-title" className="sr-only">
        {header.title}
      </h1>
      <div className="flex items-center gap-2.5 md:gap-6">
        <TeamLink team={header.away} side="away" />
        <div className="flex shrink-0 flex-col items-center gap-2">
          <StatusLine header={header} />
          <Scoreboard header={header} />
        </div>
        <TeamLink team={header.home} side="home" />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-meta text-muted uppercase">
          {header.venueLabel && (
            <>
              <span>{header.venueLabel}</span>
              <span aria-hidden="true">{strings.game.header.separator}</span>
            </>
          )}
          <span>
            <span className="sr-only">{strings.broadcast.label}</span>
            {header.channelLabel}
          </span>
        </p>
        {header.seriesLabel && (
          <p className="text-meta font-bold text-accent-soft uppercase">
            {header.seriesLabel}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export function LineScore({
  lineScore,
  isLive,
}: {
  lineScore: LineScoreView;
  isLive: boolean;
}) {
  return (
    <div className="overflow-x-auto border-t border-white/8 pt-4">
      <table className="w-full min-w-80 text-sm tabular-nums">
        <caption className="sr-only">{strings.game.lineScore.title}</caption>
        <thead>
          <tr className="text-meta text-muted">
            <th scope="col" className="text-left font-normal">
              <span className="sr-only">{strings.game.lineScore.team}</span>
            </th>
            {lineScore.periodLabels.map((label) => (
              <th key={label} scope="col" className="font-normal">
                {label}
              </th>
            ))}
            <th scope="col" className="font-normal text-foreground">
              {strings.game.lineScore.total}
            </th>
          </tr>
        </thead>
        <tbody>
          {lineScore.rows.map((row) => (
            <tr key={row.side}>
              <th
                scope="row"
                className="py-1 text-left font-display text-base font-normal tracking-[0.04em]"
              >
                {row.abbreviation}
              </th>
              {row.periodScores.map((periodScore, index) => (
                <td
                  key={lineScore.periodLabels[index]}
                  className={`text-center ${periodScore === null ? "text-muted" : ""}`}
                >
                  {periodScore ?? strings.game.lineScore.notPlayed}
                </td>
              ))}
              <td
                className={`text-center font-display text-xl ${row.isDimmed ? "text-muted" : isLive && row.isLeading ? "text-link" : ""}`}
              >
                {row.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
