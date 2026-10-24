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
import { strings } from "@/app/lib/strings";

const TEAMS_PATH_PREFIX = "/teams/";
const STANDINGS_PATH = "/standings";
const TAB_PARAM = "tab";
const TEAM_TAB_IDS = ["schedule", "roster", "standings"] as const;
const DEFAULT_TEAM_TAB = "schedule";

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

function screenOf(
  query: TeamQueryState,
  standingsQuery: StandingsQueryState,
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
  tabParam,
  favoriteTeamIds,
}: TeamViewInput): TeamView {
  return {
    screen: screenOf(query, standingsQuery, favoriteTeamIds),
    tabs: tabsOf(slug, tabParam),
  };
}
