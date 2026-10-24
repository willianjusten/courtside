import type {
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

export type StandingsQueryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; standings: Standings }
  // A refetch failed, so the last standings are kept.
  | { status: "stale"; standings: Standings };

export type StandingsViewInput = {
  query: StandingsQueryState;
  favoriteTeamIds: string[];
  // The raw `?conf=` value, e.g. "east".
  conferenceParam: string | null;
};

export type StandingsZone = "playoff" | "play-in" | "none";
type MarkedZone = Exclude<StandingsZone, "none">;

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
  streak: string;
  streakKind: StreakKind | null;
  zone: StandingsZone;
  // Conveys the zone in text, since its color alone does not reach screen readers; null outside the zones.
  zoneLabel: string | null;
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
};

export type StandingsScreen =
  | { kind: "loading" }
  | { kind: "error" }
  | StandingsReadyScreen;

export type StandingsView = {
  screen: StandingsScreen;
};

const MARKED_ZONES: MarkedZone[] = ["playoff", "play-in"];

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

function zoneOf(seed: number): StandingsZone {
  if (seed <= LAST_PLAYOFF_SEED) return "playoff";
  if (seed <= LAST_PLAY_IN_SEED) return "play-in";
  return "none";
}

// Win percentage as standings tables print it: ".750", or "1.000" for an unbeaten team.
function formatWinPercent(winPercent: number) {
  return winPercent.toFixed(3).replace(/^0/, "");
}

function tableRowOf(
  row: StandingsRow,
  favoriteTeamIds: string[],
): StandingsTableRow {
  const zone = zoneOf(row.seed);

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
    streak: row.streak ?? strings.standings.noStreak,
    streakKind: streakKindOf(row.streak),
    zone,
    zoneLabel: zone === "none" ? null : strings.standings.zones[zone].rowLabel,
    isFavorite: favoriteTeamIds.includes(row.team.id),
  };
}

function readyScreenOf(
  standings: Standings,
  favoriteTeamIds: string[],
  conferenceParam: string | null,
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
      href: `${STANDINGS_PATH}?conf=${conferenceIdOf(conference)}`,
      selected: conference === selected,
    })),
    conferenceLabel: selected?.name ?? "",
    rows,
    legend: MARKED_ZONES.filter((zone) =>
      rows.some((row) => row.zone === zone),
    ).map((zone) => ({ zone, label: strings.standings.zones[zone].legend })),
  };
}

export function buildStandingsView({
  query,
  favoriteTeamIds,
  conferenceParam,
}: StandingsViewInput): StandingsView {
  switch (query.status) {
    case "loading":
      return { screen: { kind: "loading" } };
    case "error":
      return { screen: { kind: "error" } };
    case "success":
    case "stale":
      return {
        screen: readyScreenOf(
          query.standings,
          favoriteTeamIds,
          conferenceParam,
        ),
      };
  }
}
