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
import { DESKTOP_SURFACE_CLASS_NAME, SURFACE_CLASS_NAME } from "./styles";

const HEADER_LOGO_SIZE = 52;
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
        <span className="text-meta whitespace-nowrap text-muted">
          {team.recordLabel}
        </span>
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

function BackArrow({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

function StatusChip({ header }: { header: GameHeaderView }) {
  return (
    <GameStatusChip
      status={header.status}
      label={header.statusLabel}
      startTime={header.startTime}
    />
  );
}

function ChannelLabel({ channelLabel }: { channelLabel: string }) {
  return (
    <span>
      <span className="sr-only">{strings.broadcast.label}</span>
      {channelLabel}
    </span>
  );
}

function Separator() {
  return <span aria-hidden="true">{strings.game.header.separator}</span>;
}

// On mobile the venue, date, channel, and status sit in a top bar beside the back button, as in the GameDetail artboard.
function MobileTopBar({ header }: { header: GameHeaderView }) {
  return (
    <div className="flex items-center gap-3 md:hidden">
      <Link
        href={header.back.href}
        aria-label={strings.game.header.back(header.back.label)}
        className={`flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-white/12 bg-white/6 ${FOCUS_RING_CLASS_NAME}`}
      >
        <BackArrow className="size-[19px]" />
      </Link>
      <div className="flex min-w-0 grow flex-col">
        {header.venueLabel && (
          <span className="truncate text-meta text-muted uppercase">
            {header.venueLabel}
          </span>
        )}
        <span className="truncate text-[13px] font-medium">
          {header.dateLabel}
          <Separator />
          <ChannelLabel channelLabel={header.channelLabel} />
        </span>
      </div>
      <StatusChip header={header} />
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
    <section aria-labelledby="game-title" className="flex flex-col gap-4">
      <h1 id="game-title" className="sr-only">
        {header.title}
      </h1>
      <MobileTopBar header={header} />
      <Link
        href={header.back.href}
        aria-label={strings.game.header.back(header.back.label)}
        className={`hidden min-h-11 items-center gap-2 self-start rounded-tile text-[13px] font-bold text-link md:inline-flex ${FOCUS_RING_CLASS_NAME}`}
      >
        <BackArrow className="size-4" />
        {header.back.label}
      </Link>
      <div
        className={`flex flex-col gap-4 md:px-7 md:py-6 ${DESKTOP_SURFACE_CLASS_NAME}`}
      >
        <div className="flex items-end gap-2.5 md:items-center md:gap-6">
          <TeamLink team={header.away} side="away" />
          <div className="flex shrink-0 flex-col items-center gap-1.5 pb-1.5 md:gap-2 md:pb-0">
            <div className="hidden md:block">
              <StatusChip header={header} />
            </div>
            <Scoreboard header={header} />
            {isInProgress(header.status) && (
              <span className="text-meta text-secondary">
                {header.statusLabel}
              </span>
            )}
          </div>
          <TeamLink team={header.home} side="home" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="hidden text-meta text-muted uppercase md:block">
            {header.venueLabel && (
              <>
                <span>{header.venueLabel}</span>
                <Separator />
              </>
            )}
            <ChannelLabel channelLabel={header.channelLabel} />
          </p>
          {header.seriesLabel && (
            <p className="text-meta font-bold text-accent-soft uppercase">
              {header.seriesLabel}
            </p>
          )}
        </div>
        {children}
      </div>
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
    // A card of its own on mobile; inside the header card, under a divider, on desktop.
    <div
      className={`overflow-x-auto px-3.5 py-2.5 md:rounded-none md:border-0 md:border-t md:border-white/8 md:bg-transparent md:px-0 md:pt-4 md:pb-0 ${SURFACE_CLASS_NAME}`}
    >
      <table className="w-full text-sm tabular-nums">
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
