import type {
  Game,
  GameCompetitor,
  GameStatus,
  PlayoffSeries,
} from "@/app/lib/domain/game";
import type { GameSummary } from "@/app/lib/domain/game-summary";
import {
  finalLabel,
  hasScore,
  isInProgress,
  leadingSideOf,
  periodLabel,
  REGULATION_PERIODS,
} from "@/app/lib/game/status";
import type { TeamSide } from "@/app/lib/home/team-colors";
import { strings } from "@/app/lib/strings";
import { teamPathOf } from "@/app/lib/team/team-path";
import { formatTipOff } from "@/app/lib/time/tip-off";

const SEPARATOR = strings.game.header.separator;

export type GameSummaryQueryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; summary: GameSummary }
  // A refetch failed, so the last summary is kept.
  | { status: "stale"; summary: GameSummary };

export type GameViewInput = {
  query: GameSummaryQueryState;
  // The browser timezone; null while server rendering, where the viewer's timezone is unknown.
  timeZone: string | null;
};

export type HeaderTeam = {
  name: string;
  displayName: string;
  abbreviation: string;
  logoUrl: string | null;
  // The record and the side, e.g. "3-1 · away".
  recordLabel: string;
  href: string;
  score: number | null;
  isLeading: boolean;
  isDimmed: boolean;
};

export type GameHeader = {
  title: string;
  status: GameStatus;
  startTime: string;
  // Null only for a scheduled game until the browser timezone is known.
  statusLabel: string | null;
  away: HeaderTeam;
  home: HeaderTeam;
  leadingSide: TeamSide | null;
  channelLabel: string;
  venueLabel: string | null;
  seriesLabel: string | null;
};

export type LineScoreRow = {
  side: TeamSide;
  abbreviation: string;
  // Null for a period not played yet.
  periodScores: (number | null)[];
  total: number;
  isLeading: boolean;
  isDimmed: boolean;
};

export type LineScoreView = {
  periodLabels: string[];
  // Away first, as the header reads.
  rows: LineScoreRow[];
};

export type GameScreen =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "pre-game"; header: GameHeader; note: string }
  // Canceled games share the postponed screen; the status label tells them apart.
  | { kind: "postponed"; header: GameHeader; note: string }
  | { kind: "live"; header: GameHeader; lineScore: LineScoreView }
  | { kind: "final"; header: GameHeader; lineScore: LineScoreView };

export type GameView = {
  screen: GameScreen;
  // Set when a refetch failed and the screen shows the last summary.
  staleNotice: string | null;
};

function statusLabelOf(game: Game, timeZone: string | null): string | null {
  const { status } = game;
  switch (status.kind) {
    case "scheduled":
      return timeZone
        ? formatTipOff(game.startTime, game.nbaDate, timeZone)
        : null;
    case "live":
      return `${periodLabel(status.period)} ${status.clock}`;
    case "halftime":
      return strings.gameStatus.halftime;
    case "final":
      return finalLabel(status.period);
    case "postponed":
      return strings.gameStatus.postponed;
    case "canceled":
      return strings.gameStatus.canceled;
  }
}

function headerTeamOf(
  competitor: GameCompetitor,
  side: TeamSide,
  game: Game,
  leadingSide: TeamSide | null,
): HeaderTeam {
  const { team } = competitor;
  const isLeading = leadingSide === side;

  return {
    name: team.name,
    displayName: team.displayName,
    abbreviation: team.abbreviation,
    logoUrl: team.logoUrl,
    recordLabel: [competitor.record, strings.game.header.sides[side]]
      .filter(Boolean)
      .join(SEPARATOR),
    href: teamPathOf(team.name),
    score: hasScore(game.status) ? competitor.score : null,
    isLeading,
    isDimmed: game.status.kind === "final" && !isLeading,
  };
}

function channelLabelOf(game: Game) {
  const nationalChannels = game.broadcasts
    .filter((broadcast) => broadcast.market === "national")
    .map((broadcast) => broadcast.name);
  return nationalChannels.length > 0
    ? nationalChannels.join(SEPARATOR)
    : strings.broadcast.localTv;
}

function venueLabelOf(venue: string | null, city: string | null) {
  if (!venue) return null;
  return city ? [venue, city].join(SEPARATOR) : venue;
}

function seriesLabelOf(
  series: PlayoffSeries | null,
  { home, away }: Game,
): string | null {
  if (!series) return null;

  const { homeWins, awayWins } = series;
  if (homeWins === awayWins) return strings.game.header.seriesTied(homeWins);

  const [leader, leaderWins, trailerWins] =
    homeWins > awayWins
      ? [home, homeWins, awayWins]
      : [away, awayWins, homeWins];
  const label = series.completed
    ? strings.game.header.seriesWon
    : strings.game.header.seriesLeads;
  return label(leader.team.abbreviation, leaderWins, trailerWins);
}

function headerOf(summary: GameSummary, timeZone: string | null): GameHeader {
  const { game } = summary;
  const leadingSide = leadingSideOf(game);

  return {
    title: strings.game.title(
      game.away.team.displayName,
      game.home.team.displayName,
    ),
    status: game.status,
    startTime: game.startTime,
    statusLabel: statusLabelOf(game, timeZone),
    away: headerTeamOf(game.away, "away", game, leadingSide),
    home: headerTeamOf(game.home, "home", game, leadingSide),
    leadingSide,
    channelLabel: channelLabelOf(game),
    venueLabel: venueLabelOf(game.venue, summary.venueCity),
    seriesLabel: seriesLabelOf(game.series, game),
  };
}

// Periods ESPN lists past the current one of a live game are not played yet, so they are left empty.
function playedPeriodCountOf(summary: GameSummary) {
  const { status } = summary.game;
  const listedPeriodCount = Math.max(
    summary.lineScore.home.length,
    summary.lineScore.away.length,
  );
  return isInProgress(status) && "period" in status
    ? status.period
    : listedPeriodCount;
}

function lineScoreOf(
  summary: GameSummary,
  leadingSide: TeamSide | null,
): LineScoreView {
  const playedPeriodCount = playedPeriodCountOf(summary);
  const periodCount = Math.max(REGULATION_PERIODS, playedPeriodCount);
  const periods = Array.from({ length: periodCount }, (_, index) => index + 1);

  const rowOf = (side: TeamSide): LineScoreRow => {
    const competitor = summary.game[side];
    const listedScores = summary.lineScore[side];
    return {
      side,
      abbreviation: competitor.team.abbreviation,
      periodScores: periods.map((period) =>
        period <= playedPeriodCount ? (listedScores[period - 1] ?? null) : null,
      ),
      total: competitor.score,
      isLeading: leadingSide === side,
      isDimmed: summary.game.status.kind === "final" && leadingSide !== side,
    };
  };

  return {
    periodLabels: periods.map(periodLabel),
    rows: [rowOf("away"), rowOf("home")],
  };
}

function screenOf(summary: GameSummary, timeZone: string | null): GameScreen {
  const header = headerOf(summary, timeZone);
  const { status } = summary.game;

  switch (status.kind) {
    case "scheduled":
      return { kind: "pre-game", header, note: strings.game.preGameNote };
    case "postponed":
      return { kind: "postponed", header, note: strings.game.postponedNote };
    case "canceled":
      return { kind: "postponed", header, note: strings.game.canceledNote };
    case "live":
    case "halftime":
      return {
        kind: "live",
        header,
        lineScore: lineScoreOf(summary, header.leadingSide),
      };
    case "final":
      return {
        kind: "final",
        header,
        lineScore: lineScoreOf(summary, header.leadingSide),
      };
  }
}

export function buildGameView({ query, timeZone }: GameViewInput): GameView {
  switch (query.status) {
    case "loading":
      return { screen: { kind: "loading" }, staleNotice: null };
    case "error":
      return { screen: { kind: "error" }, staleNotice: null };
    case "success":
      return { screen: screenOf(query.summary, timeZone), staleNotice: null };
    case "stale":
      return {
        screen: screenOf(query.summary, timeZone),
        staleNotice: strings.game.stale,
      };
  }
}
