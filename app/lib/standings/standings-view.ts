import {
  LEADER_STATS,
  type LeaderCategory,
  type LeaderStat,
  type LeagueLeader,
} from "@/app/lib/domain/leaders";
import type {
  Clincher,
  ConferenceStandings,
  Standings,
  StandingsRow,
} from "@/app/lib/domain/standings";
import { strings } from "@/app/lib/strings";
import { defaultConferenceOf } from "./favorite-conference";
import { streakKindOf, type StreakKind } from "./streak";

const STANDINGS_PATH = "/standings";
const TEAMS_PATH_PREFIX = "/teams/";
// The top 6 seeds go straight to the playoffs; seeds 7 to 10 play the play-in tournament.
const LAST_PLAYOFF_SEED = 6;
const LAST_PLAY_IN_SEED = 10;
const LEADERS_PER_CATEGORY = 5;
// Percentage leaders reflect tiny samples early in the season (e.g. 100% from the line on two attempts).
const MIN_MEDIAN_GAMES_FOR_PERCENTAGES = 10;
const VIEW_PARAM = "view";
const CONFERENCE_PARAM = "conf";

export type StandingsQueryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; standings: Standings }
  // A refetch failed, so the last standings are kept.
  | { status: "stale"; standings: Standings };

export type LeadersQueryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; categories: LeaderCategory[] }
  // A refetch failed, so the last leaders are kept.
  | { status: "stale"; categories: LeaderCategory[] };

export type StandingsViewInput = {
  query: StandingsQueryState;
  leadersQuery: LeadersQueryState;
  favoriteTeamIds: string[];
  // The raw `?conf=` value, e.g. "east".
  conferenceParam: string | null;
  // The raw `?view=` value, e.g. "leaders". Only mobile reads it; desktop shows both.
  viewParam: string | null;
};

export type StandingsZone = "playoff" | "play-in" | "none";
export type PointDifferentialKind = "positive" | "negative";
type MarkedZone = Exclude<StandingsZone, "none">;

export type ClincherMarker = {
  kind: Clincher;
  // e.g. "x", shown beside the team name.
  symbol: string;
  label: string;
};

export type StandingsTableRow = {
  teamId: string;
  seed: number;
  name: string;
  displayName: string;
  // e.g. "Indiana", shown under the name.
  location: string;
  logoUrl: string | null;
  href: string;
  // Win-loss, e.g. "3-1".
  record: string;
  // e.g. ".750", or "1.000" for an unbeaten team.
  winPercent: string;
  // e.g. "1.5", or "-" for the conference leader.
  gamesBehind: string;
  // Win-loss strings, e.g. "3-1".
  homeRecord: string;
  roadRecord: string;
  lastTenRecord: string;
  streak: string;
  streakKind: StreakKind | null;
  // Signed, e.g. "+4.2" or "-1.8"; "0.0" when even.
  pointDifferential: string;
  // null when even.
  pointDifferentialKind: PointDifferentialKind | null;
  zone: StandingsZone;
  // Conveys the zone in text, since its color alone does not reach screen readers; null outside the zones.
  zoneLabel: string | null;
  // null while the team's postseason spot is still open.
  clincher: ClincherMarker | null;
  isFavorite: boolean;
};

export type StandingsLegendEntry = {
  zone: MarkedZone;
  label: string;
};

export type ConferenceOption = {
  // The `?conf=` value, e.g. "east".
  id: string;
  label: string;
  href: string;
  selected: boolean;
};

export type StandingsReadyScreen = {
  kind: "ready";
  seasonLabel: string;
  conferenceOptions: ConferenceOption[];
  conferenceLabel: string;
  rows: StandingsTableRow[];
  legend: StandingsLegendEntry[];
  clincherLegend: ClincherMarker[];
  // Warns that the standings shown are the last ones loaded; null while they are fresh.
  staleNotice: string | null;
};

export type StandingsScreen =
  | { kind: "loading" }
  | { kind: "error" }
  // The preseason, before any regular season game.
  | { kind: "empty"; message: string }
  | StandingsReadyScreen;

export type StandingsViewId = "standings" | "leaders";

export type StandingsViewOption = {
  id: StandingsViewId;
  label: string;
  href: string;
  selected: boolean;
};

export type LeaderRow = {
  athleteId: string;
  rank: number;
  name: string;
  headshotUrl: string | null;
  // null when the leader's team is unknown.
  teamAbbreviation: string | null;
  teamLogoUrl: string | null;
  // e.g. "31.4" for an average or "52.3%" for a percentage.
  value: string;
  isFavorite: boolean;
};

export type LeaderCategoryView = { stat: LeaderStat; title: string } & (
  | { status: "ready"; leaders: LeaderRow[] }
  // Empty before the first regular season game; error when ESPN's athletes could not be loaded.
  | { status: "empty" | "error" }
);

export type StandingsLeaders =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "empty"; message: string }
  | {
      kind: "ready";
      categories: LeaderCategoryView[];
      // Explains the hidden percentage categories; null once they show.
      percentagesNote: string | null;
      // Warns that the leaders shown are the last ones loaded; null while they are fresh.
      staleNotice: string | null;
    };

export type StandingsView = {
  screen: StandingsScreen;
  selectedView: StandingsViewId;
  viewOptions: StandingsViewOption[];
  leaders: StandingsLeaders;
};

const MARKED_ZONES: MarkedZone[] = ["playoff", "play-in"];
const CLINCHERS: Clincher[] = ["playoffs", "play-in", "eliminated"];
const VIEW_IDS: StandingsViewId[] = ["standings", "leaders"];
const PERCENTAGE_STATS: LeaderStat[] = [
  "fieldGoalPercentage",
  "freeThrowPercentage",
];

function conferenceIdOf(conference: ConferenceStandings) {
  return conference.abbreviation.toLowerCase();
}

function selectedConferenceOf(
  conferences: ConferenceStandings[],
  favoriteTeamIds: string[],
  conferenceParam: string | null,
) {
  return (
    conferences.find(
      (conference) => conferenceIdOf(conference) === conferenceParam,
    ) ?? defaultConferenceOf(conferences, favoriteTeamIds)
  );
}

export function zoneOf(seed: number): StandingsZone {
  if (seed <= LAST_PLAYOFF_SEED) return "playoff";
  if (seed <= LAST_PLAY_IN_SEED) return "play-in";
  return "none";
}

// Win percentage as standings tables print it: ".750", or "1.000" for an unbeaten team.
function formatWinPercent(winPercent: number) {
  return winPercent.toFixed(3).replace(/^0/, "");
}

function formatGamesBehind(gamesBehind: number) {
  return gamesBehind === 0
    ? strings.standings.leaderGamesBehind
    : gamesBehind.toFixed(1);
}

function formatPointDifferential(pointDifferential: number) {
  const rounded = Number(pointDifferential.toFixed(1));
  // Adding 0 turns a -0 from rounding into 0, so an even team never prints "-0.0".
  const formatted = (rounded + 0).toFixed(1);

  if (rounded > 0) return { text: `+${formatted}`, kind: "positive" as const };
  if (rounded < 0) return { text: formatted, kind: "negative" as const };
  return { text: formatted, kind: null };
}

function clincherMarkerOf(clincher: Clincher): ClincherMarker {
  return { kind: clincher, ...strings.standings.clinchers[clincher] };
}

function tableRowOf(
  row: StandingsRow,
  favoriteTeamIds: string[],
): StandingsTableRow {
  const zone = zoneOf(row.seed);
  const pointDifferential = formatPointDifferential(row.pointDifferential);

  return {
    teamId: row.team.id,
    seed: row.seed,
    name: row.team.name,
    displayName: row.team.displayName,
    location: row.team.location,
    logoUrl: row.team.logoUrl,
    href: `${TEAMS_PATH_PREFIX}${row.team.slug}`,
    record: `${row.wins}-${row.losses}`,
    winPercent: formatWinPercent(row.winPercent),
    gamesBehind: formatGamesBehind(row.gamesBehind),
    homeRecord: row.homeRecord,
    roadRecord: row.roadRecord,
    lastTenRecord: row.lastTenRecord,
    streak: row.streak ?? strings.standings.noStreak,
    streakKind: streakKindOf(row.streak),
    pointDifferential: pointDifferential.text,
    pointDifferentialKind: pointDifferential.kind,
    zone,
    zoneLabel: zone === "none" ? null : strings.standings.zones[zone].rowLabel,
    clincher: row.clincher ? clincherMarkerOf(row.clincher) : null,
    isFavorite: favoriteTeamIds.includes(row.team.id),
  };
}

function gamesPlayedOf(standings: Standings) {
  return standings.conferences.flatMap((conference) =>
    conference.rows.map((row) => row.wins + row.losses),
  );
}

// Before the regular season every team is 0-0, a table with nothing to rank yet.
export function isBeforeRegularSeason(standings: Standings) {
  return (
    standings.season.currentPhase === "preseason" &&
    gamesPlayedOf(standings).every((gamesPlayed) => gamesPlayed === 0)
  );
}

// null while the standings are loading or failed to load.
function loadedStandingsOf(query: StandingsQueryState) {
  return query.status === "success" || query.status === "stale"
    ? query.standings
    : null;
}

function readyScreenOf(
  standings: Standings,
  favoriteTeamIds: string[],
  conferenceParam: string | null,
  staleNotice: string | null,
): StandingsScreen {
  const selected = selectedConferenceOf(
    standings.conferences,
    favoriteTeamIds,
    conferenceParam,
  );
  // The mapper already orders by seed; sorting again keeps the table right whatever order the rows come in.
  const rows = [...(selected?.rows ?? [])]
    .sort((first, second) => first.seed - second.seed)
    .map((row) => tableRowOf(row, favoriteTeamIds));

  return {
    kind: "ready",
    seasonLabel: strings.standings.season(standings.season.displayName),
    conferenceOptions: standings.conferences.map((conference) => ({
      id: conferenceIdOf(conference),
      label: conference.abbreviation,
      href: `${STANDINGS_PATH}?${CONFERENCE_PARAM}=${conferenceIdOf(conference)}`,
      selected: conference === selected,
    })),
    conferenceLabel: selected?.name ?? "",
    rows,
    legend: MARKED_ZONES.filter((zone) =>
      rows.some((row) => row.zone === zone),
    ).map((zone) => ({ zone, label: strings.standings.zones[zone].legend })),
    // Once any spot is decided, the legend explains every marker, as the design does.
    clincherLegend: rows.some((row) => row.clincher)
      ? CLINCHERS.map(clincherMarkerOf)
      : [],
    staleNotice,
  };
}

function screenOf(
  query: StandingsQueryState,
  favoriteTeamIds: string[],
  conferenceParam: string | null,
): StandingsScreen {
  if (query.status === "loading" || query.status === "error") {
    return { kind: query.status };
  }
  if (isBeforeRegularSeason(query.standings)) {
    return { kind: "empty", message: strings.standings.preseason };
  }
  return readyScreenOf(
    query.standings,
    favoriteTeamIds,
    conferenceParam,
    query.status === "stale" ? strings.standings.stale : null,
  );
}

function selectedViewOf(viewParam: string | null): StandingsViewId {
  return VIEW_IDS.find((id) => id === viewParam) ?? "standings";
}

// The conference in the URL rides along, so switching back to the standings keeps it.
function viewHrefOf(id: StandingsViewId, conferenceParam: string | null) {
  const searchParams = new URLSearchParams();
  if (id !== "standings") searchParams.set(VIEW_PARAM, id);
  if (conferenceParam) searchParams.set(CONFERENCE_PARAM, conferenceParam);
  return searchParams.size > 0
    ? `${STANDINGS_PATH}?${searchParams}`
    : STANDINGS_PATH;
}

function medianOf(values: number[]) {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

// null while the standings are unknown, which hides the percentages without claiming too few games were played.
function arePercentagesMeaningful(standings: Standings | null) {
  if (!standings) return null;
  const gamesPlayed = gamesPlayedOf(standings);
  return (
    gamesPlayed.length > 0 &&
    medianOf(gamesPlayed) >= MIN_MEDIAN_GAMES_FOR_PERCENTAGES
  );
}

function formatLeaderValue(stat: LeaderStat, value: number) {
  return PERCENTAGE_STATS.includes(stat)
    ? `${value.toFixed(1)}%`
    : value.toFixed(1);
}

function leaderRowOf(
  stat: LeaderStat,
  leader: LeagueLeader,
  index: number,
  favoriteTeamIds: string[],
): LeaderRow {
  return {
    athleteId: leader.athlete.id,
    rank: index + 1,
    name: leader.athlete.displayName,
    headshotUrl: leader.athlete.headshotUrl,
    teamAbbreviation: leader.team?.abbreviation ?? null,
    teamLogoUrl: leader.team?.logoUrl ?? null,
    value: formatLeaderValue(stat, leader.value),
    isFavorite: leader.team ? favoriteTeamIds.includes(leader.team.id) : false,
  };
}

function leaderCategoryViewOf(
  stat: LeaderStat,
  category: LeaderCategory | undefined,
  favoriteTeamIds: string[],
): LeaderCategoryView {
  const title = strings.standings.leaders.categories[stat];
  // A category ESPN did not send reads as failed, not as a season without leaders.
  if (!category || category.leaders === null) {
    return { stat, title, status: "error" };
  }
  if (category.leaders.length === 0) return { stat, title, status: "empty" };

  return {
    stat,
    title,
    status: "ready",
    leaders: category.leaders
      .slice(0, LEADERS_PER_CATEGORY)
      .map((leader, index) =>
        leaderRowOf(stat, leader, index, favoriteTeamIds),
      ),
  };
}

function leadersOf(
  leadersQuery: LeadersQueryState,
  query: StandingsQueryState,
  favoriteTeamIds: string[],
): StandingsLeaders {
  const standings = loadedStandingsOf(query);
  // Checked first: before the regular season there are no leaders to load or retry.
  if (standings && isBeforeRegularSeason(standings)) {
    return { kind: "empty", message: strings.standings.leaders.preseason };
  }
  if (leadersQuery.status === "loading" || leadersQuery.status === "error") {
    return { kind: leadersQuery.status };
  }

  const showsPercentages = arePercentagesMeaningful(standings);
  const shownStats = showsPercentages
    ? LEADER_STATS
    : LEADER_STATS.filter((stat) => !PERCENTAGE_STATS.includes(stat));

  return {
    kind: "ready",
    categories: shownStats.map((stat) =>
      leaderCategoryViewOf(
        stat,
        leadersQuery.categories.find((category) => category.stat === stat),
        favoriteTeamIds,
      ),
    ),
    percentagesNote:
      showsPercentages === false
        ? strings.standings.leaders.percentagesHidden
        : null,
    staleNotice:
      leadersQuery.status === "stale" ? strings.standings.leaders.stale : null,
  };
}

export function buildStandingsView({
  query,
  leadersQuery,
  favoriteTeamIds,
  conferenceParam,
  viewParam,
}: StandingsViewInput): StandingsView {
  const selectedView = selectedViewOf(viewParam);

  return {
    screen: screenOf(query, favoriteTeamIds, conferenceParam),
    selectedView,
    viewOptions: VIEW_IDS.map((id) => ({
      id,
      label: strings.standings.views[id],
      href: viewHrefOf(id, conferenceParam),
      selected: id === selectedView,
    })),
    leaders: leadersOf(leadersQuery, query, favoriteTeamIds),
  };
}
