import type { StandingsQueryState, StandingsZone } from "@/types/standings";
import type { Game, GameCompetitor, PlayoffGame } from "@/types/game";
import type { NbaDate } from "@/types/nba-date";
import type { ConferenceStandings, StandingsRow } from "@/types/standings";
import type { TeamLeaderCategory } from "@/types/leaders";
import type { RosterPlayer, TeamDetail, TeamSlug } from "@/types/team";
import { readableTeamColor } from "@/utils/team-colors";
import { zoneOf } from "@/utils/standings-zone";
import { streakKindOf, type StreakKind } from "@/utils/streak";
import {
  channelLabelOf,
  inProgressLabelOf,
  isInProgress,
  overtimeLabelOf,
  type InProgressStatus,
} from "@/utils/game-status";
import { seriesLabelOf } from "@/utils/series";
import { strings } from "@/config/strings";
import { currentNbaDate } from "@/utils/nba-date";
import { formatLocalTime, formatTipOffDay } from "@/utils/tip-off";

const TEAMS_PATH_PREFIX = "/teams/";
const TAB_PARAM = "tab";
const TEAM_TAB_IDS = ["schedule", "roster", "leaders"] as const;
const DEFAULT_TEAM_TAB = "schedule";
const GAME_PATH_PREFIX = "/game/";
// Each schedule list opens on this many games, as in the TeamPageDesktop artboard, then grows by a page per expansion.
const SCHEDULE_INITIAL_COUNT = 4;
const SCHEDULE_PAGE_SIZE = 5;
// Every round is a best of seven.
const SERIES_WINS_NEEDED = 4;
// Guards, forwards, then centers; a player without a known position goes last.
const POSITION_GROUP_ORDER = ["G", "F", "C"];

export type TeamQueryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "not-found" }
  | { status: "success"; team: TeamDetail }
  // A refetch failed, so the last team detail is kept.
  | { status: "stale"; team: TeamDetail };

export type TeamDataQueryState<Data> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; data: Data }
  // A refetch failed, so the last data is kept.
  | { status: "stale"; data: Data };

export type TeamViewInput = {
  slug: TeamSlug;
  query: TeamQueryState;
  standingsQuery: StandingsQueryState;
  // The regular season.
  scheduleQuery: TeamDataQueryState<Game[]>;
  // Empty outside the postseason; null until the playoff schedule loads, or when it fails, which leaves the regular season on its own.
  playoffGames: PlayoffGame[] | null;
  // The scoreboard of the team's game day, which overrides the cached schedule; null until it loads or without a game that day.
  scoreboardGames: Game[] | null;
  rosterQuery: TeamDataQueryState<RosterPlayer[]>;
  leadersQuery: TeamDataQueryState<TeamLeaderCategory[]>;
  // Null until the browser timezone is known, as when rendering on the server.
  timeZone: string | null;
  // How many times each schedule list was expanded.
  scheduleExpansions: TeamScheduleExpansions;
  // The raw `?tab=` value, which picks the mobile tab.
  tabParam: string | null;
  favoriteTeamIds: string[];
};

export type TeamColors = {
  // Readable on the dark ground, through the Foundations contrast rule.
  accent: string;
  // The team's own primary color, for decoration only; the accent when the team has none.
  shade: string;
};

export type TeamHeaderView = {
  // e.g. "Lakers".
  name: string;
  displayName: string;
  location: string;
  logoUrl: string | null;
  colors: TeamColors;
  // e.g. "Western Conference"; the rank, streak, and conference are null until the standings load.
  conferenceName: string | null;
  // Win-loss, e.g. "3-1"; null before the team has played and while the standings are unknown.
  record: string | null;
  // e.g. "3rd West".
  rankLabel: string | null;
  // The standings zone of the team's seed, which colors the rank.
  zone: StandingsZone | null;
  // e.g. "W2"; also null before the team has played.
  streak: string | null;
  streakKind: StreakKind | null;
};

export type TeamTileId = "home" | "away" | "lastTen";

export type TeamTile = {
  id: TeamTileId;
  label: string;
  // Win-loss, e.g. "2-0".
  value: string;
};

export type TeamFollow = {
  teamId: string;
  isFollowing: boolean;
  label: string;
};

export type TeamOpponent = {
  // e.g. "Clippers".
  name: string;
  displayName: string;
  logoUrl: string | null;
};

type TeamScheduleGame = {
  id: string;
  startTime: string;
  // The day of the tip-off in the browser timezone, e.g. "Fri" and "Oct 23".
  weekdayLabel: string;
  dateLabel: string;
  isHome: boolean;
  // "vs" at home, "@" away.
  sideLabel: string;
  opponent: TeamOpponent;
  // The game page.
  href: string;
};

export type TeamUpcomingGame = TeamScheduleGame & {
  // The local tip-off time, e.g. "7:00 PM"; null until the browser timezone is known.
  timeLabel: string | null;
  channelLabel: string;
  isPostponed: boolean;
  // The soonest game not postponed.
  isNext: boolean;
};

export type TeamLiveGame = TeamScheduleGame & {
  // e.g. "Q3 4:21" or "Halftime".
  statusLabel: string;
  channelLabel: string;
  // The status and the channel in one line, e.g. "Q3 4:21 · ESPN".
  metaLabel: string;
  // The team's score first, e.g. "88-64".
  score: string;
};

export type TeamResultOutcome = "win" | "loss";

export type TeamResult = TeamScheduleGame & {
  outcome: TeamResultOutcome;
  // "W" or "L", announced as "Win" or "Loss".
  outcomeLabel: string;
  outcomeAccessibleLabel: string;
  // The team's score first, e.g. "127-105".
  score: string;
  // e.g. "OT" or "2OT"; null for a game decided in regulation.
  overtimeLabel: string | null;
};

export type TeamPlayoffGame = {
  // e.g. "Game 3"; null when ESPN sends no note for the game.
  gameLabel: string | null;
} & (
  | ({ kind: "live" } & TeamLiveGame)
  | ({ kind: "upcoming" } & TeamUpcomingGame)
  | ({ kind: "result" } & TeamResult)
);

export type TeamPlayoffSeries = {
  // The opponent's team id, since a team meets an opponent at most once per postseason.
  id: string;
  // e.g. "West 1st Round"; null when ESPN sends no note for the games.
  roundName: string | null;
  opponent: TeamOpponent;
  // e.g. "LAL leads 3-1", "LAL wins 4-2", or "Series tied 2-2".
  statusLabel: string;
  // From Game 1.
  games: TeamPlayoffGame[];
};

export type TeamScheduleListId = "upcoming" | "results";

export type TeamScheduleExpansions = Record<TeamScheduleListId, number>;

export type TeamScheduleList<Item> = {
  // The games shown so far.
  items: Item[];
  // Null once every game shows.
  showMoreLabel: string | null;
};

export type TeamSchedule = {
  // Above the regular season, newest series first; null outside the postseason.
  playoffs: TeamPlayoffSeries[] | null;
  // Above the upcoming games; null while the team is not playing a regular season game.
  live: TeamLiveGame | null;
  // Soonest first.
  upcoming: TeamScheduleList<TeamUpcomingGame>;
  // Newest first.
  results: TeamScheduleList<TeamResult>;
  // Replaces the empty upcoming list once the season's games are all played, outside the postseason.
  emptyUpcomingMessage: string | null;
};

export type TeamRosterPlayer = {
  id: string;
  jersey: string | null;
  name: string;
  position: string | null;
  age: number | null;
  // e.g. 6' 8".
  height: string | null;
  headshotUrl: string | null;
  // e.g. "Out" or "Day-To-Day"; null for a healthy player.
  injuryStatus: string | null;
  // Why the player is out, as ESPN reports it; null without a report.
  injuryComment: string | null;
};

// A section of the team page that loads on its own, so it shows its own skeleton, error, and stale warning.
export type TeamSection<Content> =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      content: Content;
      // Warns that the content is the last one loaded; null while it is fresh.
      staleNotice: string | null;
    };

export type TeamReadyScreen = {
  kind: "ready";
  // Warns that the header is the last one loaded; null while the team and the standings are fresh.
  staleNotice: string | null;
  header: TeamHeaderView;
  follow: TeamFollow;
  // Null until the standings load, or when they fail, which leaves the header without them.
  tiles: TeamTile[] | null;
  // The mobile tiles show a skeleton meanwhile.
  areTilesLoading: boolean;
  // The desktop header sums up the home and away tiles in one chip; null until the standings load.
  homeAwayLabel: string | null;
  schedule: TeamSection<TeamSchedule>;
  // By position group, then jersey number.
  roster: TeamSection<TeamRosterPlayer[]>;
  // Points, rebounds, and assists, each with the team's leader and runners-up.
  leaders: TeamSection<TeamLeaderCategory[]>;
};

export type TeamScreen =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "not-found" }
  | TeamReadyScreen;

export type TeamTabId = (typeof TEAM_TAB_IDS)[number];

export type TeamTab = {
  id: TeamTabId;
  label: string;
  // The team page URL with the tab in the query string, so a refresh or a shared link keeps it.
  href: string;
};

export type TeamTabs = {
  selected: TeamTabId;
  items: TeamTab[];
};

export type TeamView = {
  screen: TeamScreen;
  tabs: TeamTabs;
};

type TeamStanding = {
  conference: ConferenceStandings;
  row: StandingsRow;
};

function teamStandingOf(
  standingsQuery: StandingsQueryState,
  teamId: string,
): TeamStanding | null {
  if (standingsQuery.status === "loading" || standingsQuery.status === "error")
    return null;

  for (const conference of standingsQuery.standings.conferences) {
    const row = conference.rows.find(({ team }) => team.id === teamId);
    if (row) return { conference, row };
  }
  return null;
}

const ORDINAL_SUFFIXES: Record<Intl.LDMLPluralRule, string> = {
  zero: "th",
  one: "st",
  two: "nd",
  few: "rd",
  many: "th",
  other: "th",
};
const ordinalRules = new Intl.PluralRules("en-US", { type: "ordinal" });

// e.g. 1 -> "1st", 3 -> "3rd", 11 -> "11th".
function ordinalOf(value: number) {
  return `${value}${ORDINAL_SUFFIXES[ordinalRules.select(value)]}`;
}

function colorsOf(team: TeamDetail): TeamColors {
  const accent = readableTeamColor(team);
  const rawShade = team.color ?? team.alternateColor;
  return { accent, shade: rawShade ? `#${rawShade.toLowerCase()}` : accent };
}

function headerOf(
  team: TeamDetail,
  standing: TeamStanding | null,
): TeamHeaderView {
  const base = {
    name: team.name,
    displayName: team.displayName,
    location: team.location,
    logoUrl: team.logoUrl,
    colors: colorsOf(team),
  };
  if (!standing) {
    return {
      ...base,
      conferenceName: null,
      record: team.record,
      rankLabel: null,
      zone: null,
      streak: null,
      streakKind: null,
    };
  }

  const { conference, row } = standing;
  return {
    ...base,
    conferenceName: conference.name,
    // The standings refresh every few minutes, while the team detail is cached for a day.
    record: `${row.wins}-${row.losses}`,
    rankLabel: strings.team.rank(ordinalOf(row.seed), conference.abbreviation),
    zone: zoneOf(row.seed),
    streak: row.streak,
    streakKind: streakKindOf(row.streak),
  };
}

function tilesOf({ row }: TeamStanding): TeamTile[] {
  return [
    { id: "home", label: strings.team.tiles.home, value: row.homeRecord },
    { id: "away", label: strings.team.tiles.away, value: row.roadRecord },
    {
      id: "lastTen",
      label: strings.team.tiles.lastTen,
      value: row.lastTenRecord,
    },
  ];
}

function followOf(teamId: string, favoriteTeamIds: string[]): TeamFollow {
  const isFollowing = favoriteTeamIds.includes(teamId);
  return {
    teamId,
    isFollowing,
    label: isFollowing ? strings.team.following : strings.team.follow,
  };
}

function opponentOf({ team }: GameCompetitor): TeamOpponent {
  return {
    name: team.name,
    displayName: team.displayName,
    logoUrl: team.logoUrl,
  };
}

function scheduleGameOf(
  game: Game,
  teamId: string,
  timeZone: string | null,
): TeamScheduleGame {
  const isHome = game.home.team.id === teamId;
  const { weekday, monthDay } = formatTipOffDay(
    game.startTime,
    game.nbaDate,
    timeZone,
  );
  return {
    id: game.id,
    startTime: game.startTime,
    weekdayLabel: weekday,
    dateLabel: monthDay,
    isHome,
    sideLabel: isHome ? strings.team.schedule.versus : strings.team.schedule.at,
    opponent: opponentOf(isHome ? game.away : game.home),
    href: `${GAME_PATH_PREFIX}${game.id}`,
  };
}

function sidesOf(game: Game, isHome: boolean) {
  return isHome
    ? { team: game.home, opponent: game.away }
    : { team: game.away, opponent: game.home };
}

type InProgressGame = Game & { status: InProgressStatus };

function isInProgressGame(game: Game): game is InProgressGame {
  return isInProgress(game.status);
}

function liveGameOf(
  game: InProgressGame,
  teamId: string,
  timeZone: string | null,
): TeamLiveGame {
  const scheduleGame = scheduleGameOf(game, teamId, timeZone);
  const statusLabel = inProgressLabelOf(game.status);
  const channelLabel = channelLabelOf(game);
  const { team, opponent } = sidesOf(game, scheduleGame.isHome);
  return {
    ...scheduleGame,
    statusLabel,
    channelLabel,
    metaLabel: [statusLabel, channelLabel].join(strings.broadcast.separator),
    score: strings.team.schedule.score(team.score, opponent.score),
  };
}

function byStartTime(first: Game, second: Game) {
  return Date.parse(first.startTime) - Date.parse(second.startTime);
}

function isUpcoming({ status }: Game) {
  return status.kind === "scheduled" || status.kind === "postponed";
}

function nextGameOf(games: Game[]) {
  return games
    .filter(({ status }) => status.kind === "scheduled")
    .toSorted(byStartTime)[0];
}

function upcomingGameOf(
  game: Game,
  teamId: string,
  timeZone: string | null,
  isNext: boolean,
): TeamUpcomingGame {
  return {
    ...scheduleGameOf(game, teamId, timeZone),
    timeLabel: timeZone ? formatLocalTime(game.startTime, timeZone) : null,
    channelLabel: channelLabelOf(game),
    isPostponed: game.status.kind === "postponed",
    isNext,
  };
}

function upcomingGamesOf(
  games: Game[],
  teamId: string,
  timeZone: string | null,
): TeamUpcomingGame[] {
  const upcomingGames = games.filter(isUpcoming).toSorted(byStartTime);
  const nextGame = nextGameOf(upcomingGames);

  return upcomingGames.map((game) =>
    upcomingGameOf(game, teamId, timeZone, game === nextGame),
  );
}

type FinalGame = Game & { status: { kind: "final"; period: number } };

function isFinal(game: Game): game is FinalGame {
  return game.status.kind === "final";
}

// Derived from the scores, since ESPN can leave the winner flag out of a final game.
function outcomeOf(game: FinalGame, teamId: string): TeamResultOutcome {
  const { team, opponent } = sidesOf(game, game.home.team.id === teamId);
  return team.score > opponent.score ? "win" : "loss";
}

function resultOf(
  game: FinalGame,
  teamId: string,
  timeZone: string | null,
): TeamResult {
  const scheduleGame = scheduleGameOf(game, teamId, timeZone);
  const { team, opponent } = sidesOf(game, scheduleGame.isHome);
  const outcome = outcomeOf(game, teamId);
  const { label, accessibleLabel } = strings.team.schedule.outcomes[outcome];
  return {
    ...scheduleGame,
    outcome,
    outcomeLabel: label,
    outcomeAccessibleLabel: accessibleLabel,
    score: strings.team.schedule.score(team.score, opponent.score),
    overtimeLabel: overtimeLabelOf(game.status.period),
  };
}

function resultsOf(
  games: Game[],
  teamId: string,
  timeZone: string | null,
): TeamResult[] {
  return games
    .filter(isFinal)
    .toSorted((first, second) => byStartTime(second, first))
    .map((game) => resultOf(game, teamId, timeZone));
}

function playoffGameOf(
  game: PlayoffGame,
  teamId: string,
  timeZone: string | null,
  isNext: boolean,
): TeamPlayoffGame | null {
  const gameLabel =
    game.gameNumber === null
      ? null
      : strings.team.playoffs.game(game.gameNumber);
  if (isInProgressGame(game)) {
    return { kind: "live", gameLabel, ...liveGameOf(game, teamId, timeZone) };
  }
  if (isUpcoming(game)) {
    return {
      kind: "upcoming",
      gameLabel,
      ...upcomingGameOf(game, teamId, timeZone, isNext),
    };
  }
  if (isFinal(game)) {
    return { kind: "result", gameLabel, ...resultOf(game, teamId, timeZone) };
  }
  // A canceled game is left out, as in the regular season lists.
  return null;
}

// The team schedule sends no series record, so it is counted from the series' final games.
function seriesStatusLabelOf(
  team: GameCompetitor["team"],
  opponent: GameCompetitor["team"],
  games: Game[],
  teamId: string,
) {
  const outcomes = games.filter(isFinal).map((game) => outcomeOf(game, teamId));
  const wins = outcomes.filter((outcome) => outcome === "win").length;
  const losses = outcomes.length - wins;
  return seriesLabelOf(
    { abbreviation: team.abbreviation, wins },
    { abbreviation: opponent.abbreviation, wins: losses },
    Math.max(wins, losses) >= SERIES_WINS_NEEDED,
  );
}

function playoffsOf(
  playoffGames: PlayoffGame[] | null,
  teamId: string,
  timeZone: string | null,
): TeamPlayoffSeries[] | null {
  if (!playoffGames || playoffGames.length === 0) return null;

  const nextGame = nextGameOf(playoffGames);
  const gamesByOpponentId = new Map<string, PlayoffGame[]>();
  for (const game of playoffGames.toSorted(byStartTime)) {
    const opponentId = sidesOf(game, game.home.team.id === teamId).opponent.team
      .id;
    gamesByOpponentId.set(opponentId, [
      ...(gamesByOpponentId.get(opponentId) ?? []),
      game,
    ]);
  }
  return [...gamesByOpponentId]
    .map(([opponentId, games]) => {
      const [firstGame] = games;
      const { team, opponent } = sidesOf(
        firstGame,
        firstGame.home.team.id === teamId,
      );
      return {
        id: opponentId,
        roundName: firstGame.roundName,
        opponent: opponentOf(opponent),
        statusLabel: seriesStatusLabelOf(
          team.team,
          opponent.team,
          games,
          teamId,
        ),
        games: games.flatMap(
          (game) =>
            playoffGameOf(game, teamId, timeZone, game === nextGame) ?? [],
        ),
      };
    })
    .toReversed();
}

function scheduleListOf<Item>(
  items: Item[],
  expansions: number,
): TeamScheduleList<Item> {
  const shownCount = SCHEDULE_INITIAL_COUNT + expansions * SCHEDULE_PAGE_SIZE;
  return {
    items: items.slice(0, shownCount),
    showMoreLabel:
      items.length > shownCount ? strings.team.schedule.showMore : null,
  };
}

// The scoreboard refreshes every few seconds while the schedule is cached for minutes, so its copy of a game wins.
function withScoreboard<ScheduledGame extends Game>(
  games: ScheduledGame[],
  scoreboardGames: Game[] | null,
): ScheduledGame[] {
  if (!scoreboardGames) return games;
  const scoreboardGamesById = new Map(
    scoreboardGames.map((game) => [game.id, game]),
  );
  return games.map((game) => {
    const scoreboardGame = scoreboardGamesById.get(game.id);
    return scoreboardGame ? { ...game, ...scoreboardGame } : game;
  });
}

function scheduleOf(
  cachedGames: Game[],
  cachedPlayoffGames: PlayoffGame[] | null,
  scoreboardGames: Game[] | null,
  teamId: string,
  timeZone: string | null,
  expansions: TeamScheduleExpansions,
): TeamSchedule {
  const games = withScoreboard(cachedGames, scoreboardGames);
  const playoffs = playoffsOf(
    cachedPlayoffGames && withScoreboard(cachedPlayoffGames, scoreboardGames),
    teamId,
    timeZone,
  );
  const upcoming = upcomingGamesOf(games, teamId, timeZone);
  const liveGame = games.find(isInProgressGame);
  return {
    playoffs,
    live: liveGame ? liveGameOf(liveGame, teamId, timeZone) : null,
    upcoming: scheduleListOf(upcoming, expansions.upcoming),
    results: scheduleListOf(
      resultsOf(games, teamId, timeZone),
      expansions.results,
    ),
    emptyUpcomingMessage:
      upcoming.length === 0 && !playoffs
        ? strings.team.schedule.offseason
        : null,
  };
}

// A detailed or combined position sorts with its main group, e.g. "PG" and "G-F" with the guards.
function positionGroupRankOf(position: string | null) {
  const mainPosition = position?.split("-")[0].at(-1);
  const rank = mainPosition ? POSITION_GROUP_ORDER.indexOf(mainPosition) : -1;
  return rank === -1 ? POSITION_GROUP_ORDER.length : rank;
}

// "0" before "00", and a player without a number last.
function compareJerseys(first: string | null, second: string | null) {
  if (first === null || second === null) {
    return Number(first === null) - Number(second === null);
  }
  return Number(first) - Number(second) || first.length - second.length;
}

function rosterOf(players: RosterPlayer[]): TeamRosterPlayer[] {
  return players
    .toSorted(
      (first, second) =>
        positionGroupRankOf(first.position) -
          positionGroupRankOf(second.position) ||
        compareJerseys(first.jersey, second.jersey),
    )
    .map((player) => ({
      id: player.id,
      jersey: player.jersey,
      name: player.displayName,
      position: player.position,
      age: player.age,
      height: player.height,
      headshotUrl: player.headshotUrl,
      injuryStatus: player.injuryStatus,
      injuryComment: player.injuryComment,
    }));
}

function sectionOf<Data, Content>(
  query: TeamDataQueryState<Data>,
  { error, stale }: { error: string; stale: string },
  contentOf: (data: Data) => Content,
): TeamSection<Content> {
  if (query.status === "loading") return { kind: "loading" };
  if (query.status === "error") return { kind: "error", message: error };
  return {
    kind: "ready",
    content: contentOf(query.data),
    staleNotice: query.status === "stale" ? stale : null,
  };
}

function screenOf(
  query: TeamQueryState,
  standingsQuery: StandingsQueryState,
  schedule: Pick<
    TeamViewInput,
    | "scheduleQuery"
    | "playoffGames"
    | "scoreboardGames"
    | "timeZone"
    | "scheduleExpansions"
  >,
  rosterQuery: TeamDataQueryState<RosterPlayer[]>,
  leadersQuery: TeamDataQueryState<TeamLeaderCategory[]>,
  favoriteTeamIds: string[],
): TeamScreen {
  if (
    query.status === "loading" ||
    query.status === "error" ||
    query.status === "not-found"
  ) {
    return { kind: query.status };
  }

  const teamId = query.team.id;
  const standing = teamStandingOf(standingsQuery, teamId);
  return {
    kind: "ready",
    staleNotice:
      query.status === "stale" || standingsQuery.status === "stale"
        ? strings.team.stale
        : null,
    header: headerOf(query.team, standing),
    follow: followOf(teamId, favoriteTeamIds),
    tiles: standing && tilesOf(standing),
    areTilesLoading: standingsQuery.status === "loading",
    homeAwayLabel:
      standing &&
      strings.team.homeAway(standing.row.homeRecord, standing.row.roadRecord),
    schedule: sectionOf(
      schedule.scheduleQuery,
      strings.team.schedule,
      (games) =>
        scheduleOf(
          games,
          schedule.playoffGames,
          schedule.scoreboardGames,
          teamId,
          schedule.timeZone,
          schedule.scheduleExpansions,
        ),
    ),
    roster: sectionOf(rosterQuery, strings.team.roster, rosterOf),
    leaders: sectionOf(
      leadersQuery,
      strings.team.leaders,
      (categories) => categories,
    ),
  };
}

function isTeamTabId(tab: string): tab is TeamTabId {
  return (TEAM_TAB_IDS as readonly string[]).includes(tab);
}

function tabsOf(slug: TeamSlug, tabParam: string | null): TeamTabs {
  const teamPath = `${TEAMS_PATH_PREFIX}${slug}`;

  return {
    selected: tabParam && isTeamTabId(tabParam) ? tabParam : DEFAULT_TEAM_TAB,
    items: TEAM_TAB_IDS.map((id) => ({
      id,
      label: strings.team.tabs[id],
      href:
        id === DEFAULT_TEAM_TAB ? teamPath : `${teamPath}?${TAB_PARAM}=${id}`,
    })),
  };
}

export function buildTeamView({
  slug,
  query,
  standingsQuery,
  scheduleQuery,
  playoffGames,
  scoreboardGames,
  rosterQuery,
  leadersQuery,
  timeZone,
  scheduleExpansions,
  tabParam,
  favoriteTeamIds,
}: TeamViewInput): TeamView {
  return {
    screen: screenOf(
      query,
      standingsQuery,
      {
        scheduleQuery,
        playoffGames,
        scoreboardGames,
        timeZone,
        scheduleExpansions,
      },
      rosterQuery,
      leadersQuery,
      favoriteTeamIds,
    ),
    tabs: tabsOf(slug, tabParam),
  };
}

// The NBA date whose scoreboard carries the team's game: a game still live past midnight Eastern keeps its own date.
export function scoreboardDateOf(
  games: Game[] | null,
  now: Date,
): NbaDate | null {
  if (!games) return null;

  const liveGame = games.find(isInProgressGame);
  if (liveGame) return liveGame.nbaDate;

  const today = currentNbaDate(now);
  return games.some(({ nbaDate }) => nbaDate === today) ? today : null;
}
