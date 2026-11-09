import { seriesLabelOf } from "@/lib/series";
import type {
  Game,
  GameCompetitor,
  GameStatus,
  PlayoffSeries,
} from "@/lib/domain/game";
import type {
  BoxScorePlayer,
  BoxScoreStats,
  GameSummary,
  GameVideo,
  Play,
  TeamStatistics,
} from "@/lib/domain/game-summary";
import { GAME_LEADER_STATS, type GameLeaderStat } from "@/lib/domain/leaders";
import { gameFlowOf, type GameFlowView } from "@/features/game/game-flow";
import {
  channelLabelOf,
  finalLabel,
  hasScore,
  isInProgress,
  leadingSideOf,
  periodLabel,
  REGULATION_PERIODS,
} from "@/lib/game-status";
import { readableTeamColors, type TeamSide } from "@/lib/team-colors";
import { strings } from "@/lib/strings";
import { teamPathOf } from "@/lib/team-path";
import { formatNbaDate, formatShortNbaDate } from "@/lib/time/nba-date";
import { formatTipOff } from "@/lib/time/tip-off";

const SEPARATOR = strings.game.header.separator;

export type { GameFlowView } from "@/features/game/game-flow";

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
  // The raw `?tab=` value, which picks the mobile tab.
  tabParam: string | null;
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

export type BackLink = {
  href: string;
  label: string;
};

export type GameHeader = {
  title: string;
  // The games page of the game's NBA date.
  back: BackLink;
  dateLabel: string;
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

const BOX_SCORE_STATS = [
  "points",
  "minutes",
  "rebounds",
  "assists",
  "steals",
  "blocks",
  "turnovers",
  "fieldGoals",
  "threePointers",
  "freeThrows",
  "plusMinus",
] as const satisfies readonly (keyof BoxScoreStats)[];

export type BoxScoreStat = (typeof BOX_SCORE_STATS)[number];

export type BoxScoreLine = Pick<BoxScoreStats, BoxScoreStat>;

export type BoxScoreColumn = {
  stat: BoxScoreStat;
  label: string;
};

export type PlusMinusTone = "positive" | "negative" | null;

export type BoxScoreAthleteRow = {
  id: string;
  jersey: string | null;
  name: string;
  shortName: string;
  position: string | null;
};

export type BoxScorePlayerRow = BoxScoreAthleteRow & {
  stats: BoxScoreLine;
  plusMinusTone: PlusMinusTone;
};

export type DidNotPlayRow = BoxScoreAthleteRow & {
  // e.g. "DNP - COACH'S DECISION"; null for a player who has not checked in yet during a live game.
  reason: string | null;
};

export type TeamBoxScoreView = {
  side: TeamSide;
  teamName: string;
  starters: BoxScorePlayerRow[];
  bench: BoxScorePlayerRow[];
  didNotPlay: DidNotPlayRow[];
  // Null until ESPN lists the team's players. Minutes and plus-minus are empty.
  totals: BoxScoreLine | null;
};

export type BoxScoreView = {
  columns: BoxScoreColumn[];
  // "Did not play" once the game is final, "Yet to play" while it is live.
  didNotPlayLabel: string;
  // Away first, as the header reads.
  teams: TeamBoxScoreView[];
};

const TEAM_STATS = [
  "fieldGoalPercentage",
  "threePointPercentage",
  "freeThrowPercentage",
  "rebounds",
  "assists",
  "turnovers",
  "steals",
  "blocks",
  "pointsInPaint",
  "fastBreakPoints",
  "largestLead",
] as const satisfies readonly (keyof TeamStatistics)[];

export type TeamStat = (typeof TEAM_STATS)[number];

const PERCENTAGE_STATS = new Set<TeamStat>([
  "fieldGoalPercentage",
  "threePointPercentage",
  "freeThrowPercentage",
]);
const FEWER_IS_BETTER_STATS = new Set<TeamStat>(["turnovers"]);

export type TeamStatRow = {
  stat: TeamStat;
  label: string;
  away: string;
  home: string;
  // Null on a tie.
  betterSide: TeamSide | null;
  // Each side's percentage of the pair's sum, which sizes its bar; both 0 when the sum is 0.
  awayShare: number;
  homeShare: number;
};

export type TeamStatsTeam = {
  abbreviation: string;
  // Readable on the dark ground and apart from the other team's color.
  color: string;
};

export type TeamStatsView = {
  away: TeamStatsTeam;
  home: TeamStatsTeam;
  rows: TeamStatRow[];
};

export type GameLeaderAthlete = {
  name: string;
  teamAbbreviation: string;
  headshotUrl: string | null;
};

export type GameLeaderRow = {
  stat: GameLeaderStat;
  label: string;
  value: string;
  // One athlete, or both teams' leaders on a tie, away first as the header reads.
  athletes: GameLeaderAthlete[];
};

export type GameLeadersView = {
  // The game's leader per stat across both teams: points, rebounds, then assists,
  // leaving out a category neither team has a leader for.
  leaders: GameLeaderRow[];
};

export type PlayTeam = {
  side: TeamSide;
  // The logo's alt text.
  name: string;
  logoUrl: string | null;
};

export type PlayRow = {
  id: string;
  periodLabel: string;
  clock: string;
  // Null for plays without a team, such as the end of a period.
  team: PlayTeam | null;
  text: string;
  // The score after the play, away first, as the header reads.
  score: string;
  isScoring: boolean;
};

export type PlayPeriod = {
  period: number;
  label: string;
  // Newest first.
  plays: PlayRow[];
};

export type PlayByPlayView = {
  // Newest first, both live and final.
  plays: PlayRow[];
  // The periods with plays, in game order, for the period filter.
  periods: PlayPeriod[];
};

export type HighlightVideo = {
  id: string;
  title: string;
  // e.g. "0:19".
  durationLabel: string;
  playLabel: string;
  thumbnailUrl: string | null;
  sourceUrl: string;
  espnUrl: string | null;
};

export type HighlightsView = {
  countLabel: string;
  // In ESPN order, never empty.
  videos: HighlightVideo[];
};

const GAME_TAB_IDS = ["summary", "box", "stats", "plays"] as const;
const DEFAULT_GAME_TAB = "summary";

export type GameTabId = (typeof GAME_TAB_IDS)[number];

export type GameTab = {
  id: GameTabId;
  label: string;
  // The game center URL with the tab in the query string, so a refresh or a shared link keeps it.
  href: string;
};

export type GameTabs = {
  selected: GameTabId;
  items: GameTab[];
};

export type GameScreen =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "pre-game"; header: GameHeader; note: string }
  // Canceled games share the postponed screen; the status label tells them apart.
  | { kind: "postponed"; header: GameHeader; note: string }
  | {
      kind: "live";
      header: GameHeader;
      lineScore: LineScoreView;
      // Null until ESPN lists any leader.
      leaders: GameLeadersView | null;
      // Null until ESPN lists any player.
      boxScore: BoxScoreView | null;
      // Null until ESPN lists the statistics of both teams.
      teamStats: TeamStatsView | null;
      // Null until ESPN sends any play.
      gameFlow: GameFlowView | null;
      playByPlay: PlayByPlayView;
      // Null when ESPN has no playable video.
      highlights: HighlightsView | null;
      tabs: GameTabs;
    }
  | {
      kind: "final";
      header: GameHeader;
      lineScore: LineScoreView;
      leaders: GameLeadersView | null;
      boxScore: BoxScoreView | null;
      teamStats: TeamStatsView | null;
      gameFlow: GameFlowView | null;
      playByPlay: PlayByPlayView;
      highlights: HighlightsView | null;
      tabs: GameTabs;
    };

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

function venueLabelOf(venue: string | null, city: string | null) {
  if (!venue) return null;
  return city ? [venue, city].join(SEPARATOR) : venue;
}

function gameSeriesLabelOf(
  series: PlayoffSeries | null,
  { home, away }: Game,
): string | null {
  if (!series) return null;

  return seriesLabelOf(
    { abbreviation: home.team.abbreviation, wins: series.homeWins },
    { abbreviation: away.team.abbreviation, wins: series.awayWins },
    series.completed,
  );
}

function headerOf(summary: GameSummary, timeZone: string | null): GameHeader {
  const { game } = summary;
  const leadingSide = leadingSideOf(game);

  return {
    title: strings.game.title(
      game.away.team.displayName,
      game.home.team.displayName,
    ),
    back: {
      href: `/games/${game.nbaDate}`,
      label: formatNbaDate(game.nbaDate),
    },
    dateLabel: formatShortNbaDate(game.nbaDate),
    status: game.status,
    startTime: game.startTime,
    statusLabel: statusLabelOf(game, timeZone),
    away: headerTeamOf(game.away, "away", game, leadingSide),
    home: headerTeamOf(game.home, "home", game, leadingSide),
    leadingSide,
    channelLabel: channelLabelOf(game),
    venueLabel: venueLabelOf(game.venue, summary.venueCity),
    seriesLabel: gameSeriesLabelOf(game.series, game),
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

function boxScoreLineOf(stats: BoxScoreStats): BoxScoreLine {
  return Object.fromEntries(
    BOX_SCORE_STATS.map((stat) => [stat, stats[stat]]),
  ) as BoxScoreLine;
}

function plusMinusToneOf(plusMinus: string): PlusMinusTone {
  const value = Number(plusMinus);
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return null;
}

function athleteRowOf({ athlete }: BoxScorePlayer): BoxScoreAthleteRow {
  return {
    id: athlete.id,
    jersey: athlete.jersey,
    name: athlete.displayName,
    shortName: athlete.shortName,
    position: athlete.position,
  };
}

// ESPN marks every bench player who has not checked in yet as a coach's decision while the game is live.
const COACHS_DECISION = "COACH'S DECISION";

function didNotPlayReasonOf(
  { didNotPlayReason }: BoxScorePlayer,
  isLive: boolean,
): string | null {
  if (!didNotPlayReason) {
    return isLive ? null : strings.game.boxScore.didNotPlayWithoutReason;
  }
  if (isLive && didNotPlayReason === COACHS_DECISION) return null;
  return strings.game.boxScore.didNotPlayReason(didNotPlayReason);
}

function teamBoxScoreOf(
  summary: GameSummary,
  side: TeamSide,
  isLive: boolean,
): TeamBoxScoreView {
  const { players, totals } = summary.boxScore[side];
  const starters: BoxScorePlayerRow[] = [];
  const bench: BoxScorePlayerRow[] = [];
  const didNotPlay: DidNotPlayRow[] = [];

  for (const player of players) {
    if (!player.stats) {
      didNotPlay.push({
        ...athleteRowOf(player),
        reason: didNotPlayReasonOf(player, isLive),
      });
      continue;
    }
    const row = {
      ...athleteRowOf(player),
      stats: boxScoreLineOf(player.stats),
      plusMinusTone: plusMinusToneOf(player.stats.plusMinus),
    };
    (player.starter ? starters : bench).push(row);
  }

  return {
    side,
    teamName: summary.game[side].team.name,
    starters,
    bench,
    didNotPlay,
    totals: totals && boxScoreLineOf(totals),
  };
}

function boxScoreOf(summary: GameSummary): BoxScoreView | null {
  const { home, away } = summary.boxScore;
  if (home.players.length === 0 && away.players.length === 0) return null;

  const isLive = isInProgress(summary.game.status);
  const { groups } = strings.game.boxScore;
  return {
    didNotPlayLabel: isLive ? groups.yetToPlay : groups.didNotPlay,
    columns: BOX_SCORE_STATS.map((stat) => ({
      stat,
      label: strings.game.boxScore.columns[stat],
    })),
    teams: [
      teamBoxScoreOf(summary, "away", isLive),
      teamBoxScoreOf(summary, "home", isLive),
    ],
  };
}

function betterSideOf(
  stat: TeamStat,
  away: number,
  home: number,
): TeamSide | null {
  if (away === home) return null;
  const isAwayHigher = away > home;
  return isAwayHigher !== FEWER_IS_BETTER_STATS.has(stat) ? "away" : "home";
}

function shareOf(value: number, total: number) {
  return total === 0 ? 0 : (value / total) * 100;
}

function teamStatValueOf(stat: TeamStat, value: number) {
  return PERCENTAGE_STATS.has(stat)
    ? strings.game.teamStats.percentage(value)
    : String(value);
}

function teamStatsOf(summary: GameSummary): TeamStatsView | null {
  const { home, away } = summary.teamStats;
  if (!home || !away) return null;

  const { game } = summary;
  const colors = readableTeamColors(game.home.team, game.away.team);
  const teamOf = (side: TeamSide): TeamStatsTeam => ({
    abbreviation: game[side].team.abbreviation,
    color: colors[side],
  });

  return {
    away: teamOf("away"),
    home: teamOf("home"),
    rows: TEAM_STATS.map((stat) => {
      const total = away[stat] + home[stat];
      return {
        stat,
        label: strings.game.teamStats.labels[stat],
        away: teamStatValueOf(stat, away[stat]),
        home: teamStatValueOf(stat, home[stat]),
        betterSide: betterSideOf(stat, away[stat], home[stat]),
        awayShare: shareOf(away[stat], total),
        homeShare: shareOf(home[stat], total),
      };
    }),
  };
}

function gameLeaderOf(
  summary: GameSummary,
  stat: GameLeaderStat,
): GameLeaderRow | null {
  const candidates = (["away", "home"] as const).flatMap((side) => {
    const gameLeader = summary.leaders[side].find(
      (candidate) => candidate.stat === stat,
    );
    return gameLeader ? [{ side, leader: gameLeader.leader }] : [];
  });
  if (candidates.length === 0) return null;

  const topValue = Math.max(...candidates.map(({ leader }) => leader.value));
  const topCandidates = candidates.filter(
    ({ leader }) => leader.value === topValue,
  );

  return {
    stat,
    label: strings.leaders.categories[stat].title,
    value: topCandidates[0].leader.displayValue,
    athletes: topCandidates.map(({ side, leader }) => ({
      name: leader.athlete.shortName,
      teamAbbreviation: summary.game[side].team.abbreviation,
      headshotUrl: leader.athlete.headshotUrl,
    })),
  };
}

function leadersOf(summary: GameSummary): GameLeadersView | null {
  const leaders = GAME_LEADER_STATS.flatMap((stat) => {
    const leader = gameLeaderOf(summary, stat);
    return leader ? [leader] : [];
  });
  return leaders.length > 0 ? { leaders } : null;
}

function playRowOf(play: Play, teamById: Map<string, PlayTeam>): PlayRow {
  return {
    id: play.id,
    periodLabel: periodLabel(play.period),
    clock: play.clock,
    team: (play.teamId && teamById.get(play.teamId)) || null,
    text: play.text.trim(),
    score: strings.game.plays.score(play.awayScore, play.homeScore),
    isScoring: play.scoringPlay,
  };
}

function playByPlayOf(summary: GameSummary): PlayByPlayView {
  const { home, away } = summary.game;
  const teamById = new Map(
    (
      [
        ["home", home.team],
        ["away", away.team],
      ] as const
    ).map(([side, { id, displayName, logoUrl }]) => [
      id,
      { side, name: displayName, logoUrl },
    ]),
  );
  // ESPN sends the plays in game order.
  const playsInGameOrder = summary.plays.map((play) => ({
    period: play.period,
    row: playRowOf(play, teamById),
  }));
  const plays = playsInGameOrder.map(({ row }) => row).reverse();

  const periods: PlayPeriod[] = [];
  for (const { period, row } of playsInGameOrder) {
    const currentPeriod = periods.at(-1);
    if (currentPeriod?.period === period) {
      currentPeriod.plays.unshift(row);
    } else {
      periods.push({ period, label: periodLabel(period), plays: [row] });
    }
  }

  return { plays, periods };
}

const SECONDS_PER_MINUTE = 60;

function durationLabelOf(durationSeconds: number) {
  const minutes = Math.floor(durationSeconds / SECONDS_PER_MINUTE);
  const seconds = durationSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function highlightVideoOf(video: GameVideo): HighlightVideo {
  return {
    id: video.id,
    title: video.title,
    durationLabel: durationLabelOf(video.durationSeconds),
    playLabel: strings.game.highlights.play(video.title),
    thumbnailUrl: video.thumbnailUrl,
    sourceUrl: video.sourceUrl,
    espnUrl: video.espnUrl,
  };
}

function highlightsOf({ videos }: GameSummary): HighlightsView | null {
  if (videos.length === 0) return null;
  return {
    countLabel: strings.game.highlights.count(videos.length),
    videos: videos.map(highlightVideoOf),
  };
}

function isGameTabId(tab: string): tab is GameTabId {
  return (GAME_TAB_IDS as readonly string[]).includes(tab);
}

function tabsOf(gameId: string, tabParam: string | null): GameTabs {
  const gamePath = `/game/${gameId}`;

  return {
    selected: tabParam && isGameTabId(tabParam) ? tabParam : DEFAULT_GAME_TAB,
    items: GAME_TAB_IDS.map((id) => ({
      id,
      label: strings.game.tabs[id],
      href: id === DEFAULT_GAME_TAB ? gamePath : `${gamePath}?tab=${id}`,
    })),
  };
}

function screenOf(
  summary: GameSummary,
  timeZone: string | null,
  tabParam: string | null,
): GameScreen {
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
        leaders: leadersOf(summary),
        boxScore: boxScoreOf(summary),
        teamStats: teamStatsOf(summary),
        gameFlow: gameFlowOf(summary),
        playByPlay: playByPlayOf(summary),
        highlights: highlightsOf(summary),
        tabs: tabsOf(summary.game.id, tabParam),
      };
    case "final":
      return {
        kind: "final",
        header,
        lineScore: lineScoreOf(summary, header.leadingSide),
        leaders: leadersOf(summary),
        boxScore: boxScoreOf(summary),
        teamStats: teamStatsOf(summary),
        gameFlow: gameFlowOf(summary),
        playByPlay: playByPlayOf(summary),
        highlights: highlightsOf(summary),
        tabs: tabsOf(summary.game.id, tabParam),
      };
  }
}

export function buildGameView({
  query,
  timeZone,
  tabParam,
}: GameViewInput): GameView {
  switch (query.status) {
    case "loading":
      return { screen: { kind: "loading" }, staleNotice: null };
    case "error":
      return { screen: { kind: "error" }, staleNotice: null };
    case "success":
      return {
        screen: screenOf(query.summary, timeZone, tabParam),
        staleNotice: null,
      };
    case "stale":
      return {
        screen: screenOf(query.summary, timeZone, tabParam),
        staleNotice: strings.game.stale,
      };
  }
}
