import type { Game, GameCompetitor } from "@/app/lib/domain/game";
import type {
  ConferenceStandings,
  StandingsRow,
} from "@/app/lib/domain/standings";
import type { TeamDetail, TeamSlug } from "@/app/lib/domain/team";
import { readableTeamColor } from "@/app/lib/home/team-colors";
import {
  zoneOf,
  type StandingsQueryState,
  type StandingsZone,
} from "@/app/lib/standings/standings-view";
import { streakKindOf, type StreakKind } from "@/app/lib/standings/streak";
import { channelLabelOf, overtimeLabelOf } from "@/app/lib/game/status";
import { strings } from "@/app/lib/strings";
import { formatLocalTime, formatTipOffDay } from "@/app/lib/time/tip-off";

const TEAMS_PATH_PREFIX = "/teams/";
const STANDINGS_PATH = "/standings";
const TAB_PARAM = "tab";
const TEAM_TAB_IDS = ["schedule", "roster", "standings"] as const;
const DEFAULT_TEAM_TAB = "schedule";
const GAME_PATH_PREFIX = "/game/";
// Each schedule list opens on this many games, as in the TeamPageDesktop artboard, then grows by a page per expansion.
const SCHEDULE_INITIAL_COUNT = 4;
const SCHEDULE_PAGE_SIZE = 5;

export type TeamQueryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; team: TeamDetail }
  // A refetch failed, so the last team detail is kept.
  | { status: "stale"; team: TeamDetail };

export type TeamViewInput = {
  slug: TeamSlug;
  query: TeamQueryState;
  standingsQuery: StandingsQueryState;
  // Null until the schedule loads.
  games: Game[] | null;
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

export type TeamScheduleListId = "upcoming" | "results";

export type TeamScheduleExpansions = Record<TeamScheduleListId, number>;

export type TeamScheduleList<Item> = {
  // The games shown so far.
  items: Item[];
  // Null once every game shows.
  showMoreLabel: string | null;
};

export type TeamSchedule = {
  // Soonest first.
  upcoming: TeamScheduleList<TeamUpcomingGame>;
  // Newest first.
  results: TeamScheduleList<TeamResult>;
  // Replaces the empty upcoming list once the season's games are all played.
  emptyUpcomingMessage: string | null;
};

export type TeamReadyScreen = {
  kind: "ready";
  header: TeamHeaderView;
  follow: TeamFollow;
  // Null until the standings load.
  tiles: TeamTile[] | null;
  // The desktop header sums up the home and away tiles in one chip; null until the standings load.
  homeAwayLabel: string | null;
  // The full standings, on the team's conference once it is known.
  standingsHref: string;
  // Null until the schedule loads.
  schedule: TeamSchedule | null;
};

export type TeamScreen =
  | { kind: "loading" }
  | { kind: "error" }
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

// Matches the `?conf=` value the standings page reads, e.g. "west".
function standingsHrefOf(standing: TeamStanding | null) {
  return standing
    ? `${STANDINGS_PATH}?conf=${standing.conference.abbreviation.toLowerCase()}`
    : STANDINGS_PATH;
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

function byStartTime(first: Game, second: Game) {
  return Date.parse(first.startTime) - Date.parse(second.startTime);
}

function upcomingGamesOf(
  games: Game[],
  teamId: string,
  timeZone: string | null,
): TeamUpcomingGame[] {
  const upcomingGames = games
    .filter(
      ({ status }) =>
        status.kind === "scheduled" || status.kind === "postponed",
    )
    .toSorted(byStartTime);
  const nextGame = upcomingGames.find(
    ({ status }) => status.kind === "scheduled",
  );

  return upcomingGames.map((game) => ({
    ...scheduleGameOf(game, teamId, timeZone),
    timeLabel: timeZone ? formatLocalTime(game.startTime, timeZone) : null,
    channelLabel: channelLabelOf(game),
    isPostponed: game.status.kind === "postponed",
    isNext: game === nextGame,
  }));
}

type FinalGame = Game & { status: { kind: "final"; period: number } };

function isFinal(game: Game): game is FinalGame {
  return game.status.kind === "final";
}

function resultsOf(
  games: Game[],
  teamId: string,
  timeZone: string | null,
): TeamResult[] {
  return games
    .filter(isFinal)
    .toSorted((first, second) => byStartTime(second, first))
    .map((game) => {
      const scheduleGame = scheduleGameOf(game, teamId, timeZone);
      const team = scheduleGame.isHome ? game.home : game.away;
      const opponent = scheduleGame.isHome ? game.away : game.home;
      // Derived from the scores, since ESPN can leave the winner flag out of a final game.
      const outcome: TeamResultOutcome =
        team.score > opponent.score ? "win" : "loss";
      const { label, accessibleLabel } =
        strings.team.schedule.outcomes[outcome];
      return {
        ...scheduleGame,
        outcome,
        outcomeLabel: label,
        outcomeAccessibleLabel: accessibleLabel,
        score: strings.team.schedule.score(team.score, opponent.score),
        overtimeLabel: overtimeLabelOf(game.status.period),
      };
    });
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

function scheduleOf(
  games: Game[],
  teamId: string,
  timeZone: string | null,
  expansions: TeamScheduleExpansions,
): TeamSchedule {
  const upcoming = upcomingGamesOf(games, teamId, timeZone);
  return {
    upcoming: scheduleListOf(upcoming, expansions.upcoming),
    results: scheduleListOf(
      resultsOf(games, teamId, timeZone),
      expansions.results,
    ),
    emptyUpcomingMessage:
      upcoming.length === 0 ? strings.team.schedule.offseason : null,
  };
}

function screenOf(
  query: TeamQueryState,
  standingsQuery: StandingsQueryState,
  schedule: Pick<TeamViewInput, "games" | "timeZone" | "scheduleExpansions">,
  favoriteTeamIds: string[],
): TeamScreen {
  if (query.status === "loading" || query.status === "error") {
    return { kind: query.status };
  }

  const standing = teamStandingOf(standingsQuery, query.team.id);
  return {
    kind: "ready",
    header: headerOf(query.team, standing),
    follow: followOf(query.team.id, favoriteTeamIds),
    tiles: standing && tilesOf(standing),
    homeAwayLabel:
      standing &&
      strings.team.homeAway(standing.row.homeRecord, standing.row.roadRecord),
    standingsHref: standingsHrefOf(standing),
    schedule:
      schedule.games &&
      scheduleOf(
        schedule.games,
        query.team.id,
        schedule.timeZone,
        schedule.scheduleExpansions,
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
  games,
  timeZone,
  scheduleExpansions,
  tabParam,
  favoriteTeamIds,
}: TeamViewInput): TeamView {
  return {
    screen: screenOf(
      query,
      standingsQuery,
      { games, timeZone, scheduleExpansions },
      favoriteTeamIds,
    ),
    tabs: tabsOf(slug, tabParam),
  };
}
