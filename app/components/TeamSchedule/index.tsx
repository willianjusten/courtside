import Link from "next/link";
import type { ReactNode } from "react";
import { FOCUS_RING_CLASS_NAME } from "@/app/components/DatePicker/DatePickerTrigger";
import { PANEL_HEADING_CLASS_NAME } from "@/app/components/HomeSidebar/styles";
import TeamLogo from "@/app/components/TeamLogo";
import { strings } from "@/app/lib/strings";
import type {
  TeamLiveGame,
  TeamOpponent,
  TeamPlayoffGame,
  TeamPlayoffSeries,
  TeamResult,
  TeamResultOutcome,
  TeamSchedule as TeamScheduleView,
  TeamScheduleListId,
  TeamUpcomingGame,
} from "@/app/lib/team/team-view";

const LOGO_DISPLAY_SIZE = 28;
const UP_NEXT_HEADING_ID = "team-schedule-up-next";
const RESULTS_HEADING_ID = "team-schedule-results";
const PLAYOFFS_HEADING_ID = "team-schedule-playoffs";

// The date, opponent, and trailing columns of the TeamPage and TeamPageDesktop artboards.
const ROW_CLASS_NAME =
  "grid min-h-14 grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[14px] border px-3 py-2.5 md:grid-cols-[110px_minmax(0,1fr)_auto] md:gap-4 md:px-3.5";
const DEFAULT_ROW_TONE_CLASS_NAME = "border-white/7 bg-white/3.5";
const ROW_LINK_CLASS_NAME = `transition-colors hover:bg-white/7 ${FOCUS_RING_CLASS_NAME}`;
const LIVE_ROW_TONE_CLASS_NAME =
  "border-live/34 bg-linear-to-r from-live/16 to-elevated/90 to-60%";
const NEXT_ROW_TONE_CLASS_NAME = "border-accent/45 bg-accent/8";
// A panel only from md up, as in the TeamPageDesktop artboard; mobile lists the rows straight in the tab.
const SECTION_CLASS_NAME =
  "flex flex-col gap-1.5 md:card md:gap-2.5 md:border-white/10 md:bg-white/4.5 md:p-5";
const SECTION_HEADING_CLASS_NAME = `${PANEL_HEADING_CLASS_NAME} px-0.5 py-1 md:text-xl`;

const PLAYOFF_ROW_TONE_CLASS_NAME: Record<TeamPlayoffGame["kind"], string> = {
  live: LIVE_ROW_TONE_CLASS_NAME,
  upcoming: DEFAULT_ROW_TONE_CLASS_NAME,
  result: DEFAULT_ROW_TONE_CLASS_NAME,
};

const OUTCOME_CLASS_NAME: Record<TeamResultOutcome, string> = {
  win: "bg-win/16 text-win-soft",
  loss: "bg-loss/16 text-loss",
};

function GameDay({
  weekdayLabel,
  dateLabel,
}: {
  weekdayLabel: string;
  dateLabel: string;
}) {
  return (
    <span className="flex flex-col uppercase">
      <span className="text-[10px] tracking-[0.12em] text-muted">
        {weekdayLabel}
      </span>
      <span className="font-display text-[17px] leading-tight md:text-lg">
        {dateLabel}
      </span>
    </span>
  );
}

// Mobile names the opponent by its short name, desktop by its full name, as in the artboards.
function Opponent({
  sideLabel,
  opponent,
  children,
}: {
  sideLabel: string;
  opponent: TeamOpponent;
  children?: ReactNode;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 md:gap-2.5">
      <span className="w-3.5 shrink-0 text-[11px] text-muted md:w-4 md:text-xs">
        {sideLabel}
      </span>
      <TeamLogo logoUrl={opponent.logoUrl} size={LOGO_DISPLAY_SIZE} lazy />
      <span className="truncate text-[13px] font-bold md:text-sm">
        <span className="md:hidden">{opponent.name}</span>
        <span className="hidden md:inline">{opponent.displayName}</span>
      </span>
      {children}
    </span>
  );
}

function NextChip() {
  return (
    <span className="shrink-0 rounded-full bg-accent/16 px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-accent-soft uppercase">
      {strings.team.schedule.next}
    </span>
  );
}

function LiveStatus({ game }: { game: TeamLiveGame }) {
  return (
    <span className="flex flex-col">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] text-loss uppercase md:text-[11px]">
        <span
          aria-hidden="true"
          className="size-1.5 animate-live-pulse rounded-full bg-live"
        />
        {strings.gameStatus.live}
      </span>
      <span className="hidden text-xs font-bold text-secondary md:inline">
        {game.statusLabel}
      </span>
    </span>
  );
}

// Score updates replace the text in place without a live region, so they are not announced.
function LiveScore({ game }: { game: TeamLiveGame }) {
  return (
    <span className="flex flex-col items-end text-right md:flex-row-reverse md:items-center md:gap-4">
      <span className="font-display text-lg tabular-nums md:text-[22px]">
        {game.score}
      </span>
      <span className="text-[10px] text-muted md:hidden">{game.metaLabel}</span>
      <span className="hidden text-xs text-muted md:inline">
        {game.channelLabel}
      </span>
    </span>
  );
}

function LiveGameRow({ game }: { game: TeamLiveGame }) {
  return (
    <li>
      <Link
        href={game.href}
        className={`${ROW_CLASS_NAME} ${LIVE_ROW_TONE_CLASS_NAME} ${ROW_LINK_CLASS_NAME}`}
      >
        <LiveStatus game={game} />
        <Opponent sideLabel={game.sideLabel} opponent={game.opponent} />
        <LiveScore game={game} />
      </Link>
    </li>
  );
}

function TipOff({ game }: { game: TeamUpcomingGame }) {
  return (
    <span className="flex flex-col items-end text-right md:flex-row-reverse md:items-center md:gap-4">
      {game.isPostponed ? (
        <span className="text-[13px] font-bold text-warning md:text-sm">
          {strings.gameStatus.postponed}
        </span>
      ) : (
        // Empty until the browser timezone is known, so the server markup carries no time.
        <time
          dateTime={game.startTime}
          className="text-[13px] font-bold md:text-sm"
        >
          {game.timeLabel}
        </time>
      )}
      <span className="text-[10px] text-muted md:text-xs">
        {game.channelLabel}
      </span>
    </span>
  );
}

function UpcomingGameRow({ game }: { game: TeamUpcomingGame }) {
  const toneClassName = game.isNext
    ? NEXT_ROW_TONE_CLASS_NAME
    : DEFAULT_ROW_TONE_CLASS_NAME;

  return (
    <li>
      <Link
        href={game.href}
        className={`${ROW_CLASS_NAME} ${toneClassName} ${ROW_LINK_CLASS_NAME}`}
      >
        <GameDay weekdayLabel={game.weekdayLabel} dateLabel={game.dateLabel} />
        <Opponent sideLabel={game.sideLabel} opponent={game.opponent}>
          {game.isNext && <NextChip />}
        </Opponent>
        <TipOff game={game} />
      </Link>
    </li>
  );
}

function ResultScore({ result }: { result: TeamResult }) {
  return (
    <span className="flex items-center gap-2 md:gap-3">
      <span
        className={`flex size-5.5 items-center justify-center rounded-[7px] text-[11px] font-bold md:size-6.5 md:text-xs ${OUTCOME_CLASS_NAME[result.outcome]}`}
      >
        <span aria-hidden="true">{result.outcomeLabel}</span>
        <span className="sr-only">{result.outcomeAccessibleLabel}</span>
      </span>
      <span className="font-display text-[17px] tabular-nums md:text-xl">
        {result.score}
      </span>
      {result.overtimeLabel && (
        <span className="text-[10px] font-bold text-muted md:text-xs">
          {result.overtimeLabel}
        </span>
      )}
    </span>
  );
}

function ResultRow({ result }: { result: TeamResult }) {
  return (
    <li>
      <Link
        href={result.href}
        className={`${ROW_CLASS_NAME} ${DEFAULT_ROW_TONE_CLASS_NAME} ${ROW_LINK_CLASS_NAME}`}
      >
        <GameDay
          weekdayLabel={result.weekdayLabel}
          dateLabel={result.dateLabel}
        />
        <Opponent sideLabel={result.sideLabel} opponent={result.opponent} />
        <ResultScore result={result} />
      </Link>
    </li>
  );
}

// The series header names the opponent, so each row names the game instead.
function PlayoffGameRow({ game }: { game: TeamPlayoffGame }) {
  const isNext = game.kind === "upcoming" && game.isNext;
  const toneClassName = isNext
    ? NEXT_ROW_TONE_CLASS_NAME
    : PLAYOFF_ROW_TONE_CLASS_NAME[game.kind];

  return (
    <li>
      <Link
        href={game.href}
        className={`${ROW_CLASS_NAME} ${toneClassName} ${ROW_LINK_CLASS_NAME}`}
      >
        {game.kind === "live" ? (
          <LiveStatus game={game} />
        ) : (
          <GameDay
            weekdayLabel={game.weekdayLabel}
            dateLabel={game.dateLabel}
          />
        )}
        <span className="flex min-w-0 items-center gap-2 md:gap-2.5">
          <span className="w-3.5 shrink-0 text-[11px] text-muted md:w-4 md:text-xs">
            {game.sideLabel}
          </span>
          <span className="truncate text-[13px] font-bold md:text-sm">
            {game.gameLabel ?? game.opponent.name}
          </span>
          {isNext && <NextChip />}
        </span>
        {game.kind === "live" && <LiveScore game={game} />}
        {game.kind === "upcoming" && <TipOff game={game} />}
        {game.kind === "result" && <ResultScore result={game} />}
      </Link>
    </li>
  );
}

function PlayoffSeries({ series }: { series: TeamPlayoffSeries }) {
  return (
    <li className="flex flex-col gap-1.5 md:gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-0.5 pt-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamLogo
            logoUrl={series.opponent.logoUrl}
            size={LOGO_DISPLAY_SIZE}
            lazy
          />
          <div className="flex min-w-0 flex-col">
            {series.roundName && (
              <span className="text-[10px] tracking-[0.12em] text-muted uppercase md:text-[11px]">
                {series.roundName}
              </span>
            )}
            <h3 className="truncate text-sm font-bold md:text-[15px]">
              <span className="md:hidden">{series.opponent.name}</span>
              <span className="hidden md:inline">
                {series.opponent.displayName}
              </span>
            </h3>
          </div>
        </div>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-bold md:text-xs">
          {series.statusLabel}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5 md:gap-2.5">
        {series.games.map((game) => (
          <PlayoffGameRow key={game.id} game={game} />
        ))}
      </ul>
    </li>
  );
}

function PlayoffsSection({ playoffs }: { playoffs: TeamPlayoffSeries[] }) {
  return (
    <section
      aria-labelledby={PLAYOFFS_HEADING_ID}
      className={SECTION_CLASS_NAME}
    >
      <h2 id={PLAYOFFS_HEADING_ID} className={SECTION_HEADING_CLASS_NAME}>
        {strings.team.playoffs.title}
      </h2>
      <ul className="flex flex-col gap-4 md:gap-5">
        {playoffs.map((series) => (
          <PlayoffSeries key={series.id} series={series} />
        ))}
      </ul>
    </section>
  );
}

function ScheduleSection({
  headingId,
  title,
  emptyMessage,
  showMoreLabel,
  onShowMore,
  children,
}: {
  headingId: string;
  title: string;
  emptyMessage: string | null;
  showMoreLabel: string | null;
  onShowMore: () => void;
  children: ReactNode[];
}) {
  return (
    <section aria-labelledby={headingId} className={SECTION_CLASS_NAME}>
      <h2 id={headingId} className={SECTION_HEADING_CLASS_NAME}>
        {title}
      </h2>
      {children.length > 0 ? (
        <ul className="flex flex-col gap-1.5 md:gap-2.5">{children}</ul>
      ) : (
        <p className="text-sm text-muted">{emptyMessage}</p>
      )}
      {showMoreLabel && (
        <button
          type="button"
          onClick={onShowMore}
          className={`min-h-11 cursor-pointer rounded-[14px] border border-white/10 bg-white/4 text-xs font-bold text-link transition-colors hover:bg-white/8 ${FOCUS_RING_CLASS_NAME}`}
        >
          {showMoreLabel}
        </button>
      )}
    </section>
  );
}

export default function TeamSchedule({
  schedule,
  onShowMore,
}: {
  schedule: TeamScheduleView;
  onShowMore: (listId: TeamScheduleListId) => void;
}) {
  const upNextRows = [
    ...(schedule.live
      ? [<LiveGameRow key={schedule.live.id} game={schedule.live} />]
      : []),
    ...schedule.upcoming.items.map((game) => (
      <UpcomingGameRow key={game.id} game={game} />
    )),
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {schedule.playoffs && <PlayoffsSection playoffs={schedule.playoffs} />}
      {/* Once the regular season is over, the postseason has no empty Up next to explain. */}
      {(upNextRows.length > 0 || schedule.emptyUpcomingMessage) && (
        <ScheduleSection
          headingId={UP_NEXT_HEADING_ID}
          title={strings.team.schedule.upNext}
          emptyMessage={schedule.emptyUpcomingMessage}
          showMoreLabel={schedule.upcoming.showMoreLabel}
          onShowMore={() => onShowMore("upcoming")}
        >
          {upNextRows}
        </ScheduleSection>
      )}
      <ScheduleSection
        headingId={RESULTS_HEADING_ID}
        title={strings.team.schedule.results}
        emptyMessage={strings.team.schedule.noResults}
        showMoreLabel={schedule.results.showMoreLabel}
        onShowMore={() => onShowMore("results")}
      >
        {schedule.results.items.map((result) => (
          <ResultRow key={result.id} result={result} />
        ))}
      </ScheduleSection>
    </div>
  );
}
