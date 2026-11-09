import type { Game, PlayoffGame } from "@/types/game";
import type { ListedTeam, RosterPlayer, TeamDetail } from "@/types/team";
import {
  mapListedTeam,
  mapPlayoffScheduleGame,
  mapRosterPlayer,
  mapScheduleGame,
  mapTeamDetail,
} from "./mappers";
import type {
  RawInjury,
  RawRosterResponse,
  RawTeamDetailResponse,
  RawTeamInjuriesResponse,
  RawTeamScheduleResponse,
  RawTeamsList,
} from "./raw-types";
import { POSTSEASON_TYPE_ID, REGULAR_SEASON_TYPE_ID } from "./config";
import { espnGet, espnGetRef } from "./transport";

const ATHLETE_ID_IN_REF_PATTERN = /\/athletes\/(\d+)/;

export async function fetchTeams(): Promise<ListedTeam[]> {
  const rawTeamsList = await espnGet<RawTeamsList>("teams");
  const rawTeams = rawTeamsList.sports?.[0]?.leagues?.[0]?.teams;

  // An unexpected shape must surface as an error, not as every team page being not found.
  if (!Array.isArray(rawTeams)) {
    throw new Error("ESPN teams response has no teams list");
  }

  return rawTeams.map(({ team }) => mapListedTeam(team));
}

export async function fetchTeamDetail(teamId: string): Promise<TeamDetail> {
  const { team } = await espnGet<RawTeamDetailResponse>("team", {
    pathParams: { teamId },
  });

  return mapTeamDetail(team);
}

function fetchRawTeamSchedule(teamId: string, seasonTypeId: string) {
  return espnGet<RawTeamScheduleResponse>("teamSchedule", {
    pathParams: { teamId },
    searchParams: new URLSearchParams({ seasontype: seasonTypeId }),
  });
}

// A missing events list means ESPN sent something unexpected, which must not read as a team without games.
function eventsOf(rawSchedule: RawTeamScheduleResponse, teamId: string) {
  if (!Array.isArray(rawSchedule.events)) {
    throw new Error(`ESPN schedule for team ${teamId} has no events list`);
  }
  return rawSchedule.events;
}

// Past and upcoming regular season games, in date order. The season type is explicit because during the
// postseason ESPN would otherwise answer with the playoff games.
export async function fetchTeamSchedule(teamId: string): Promise<Game[]> {
  const rawSchedule = await fetchRawTeamSchedule(
    teamId,
    REGULAR_SEASON_TYPE_ID,
  );
  return eventsOf(rawSchedule, teamId).map(mapScheduleGame);
}

// Past and upcoming playoff games, in date order; none outside the postseason, when ESPN still serves the last one.
export async function fetchTeamPlayoffSchedule(
  teamId: string,
): Promise<PlayoffGame[]> {
  const rawSchedule = await fetchRawTeamSchedule(teamId, POSTSEASON_TYPE_ID);
  if (String(rawSchedule.season?.type) !== POSTSEASON_TYPE_ID) return [];

  return eventsOf(rawSchedule, teamId).map(mapPlayoffScheduleGame);
}

// ESPN's report on each injured player, by athlete id. A report that fails to load leaves only that player without one.
async function fetchInjuryCommentsByAthleteId(
  teamId: string,
): Promise<Map<string, string>> {
  const { items } = await espnGet<RawTeamInjuriesResponse>("teamInjuries", {
    pathParams: { teamId },
  });
  if (!Array.isArray(items)) {
    throw new Error(`ESPN injuries for team ${teamId} have no items list`);
  }

  const injuryRequests = await Promise.allSettled(
    items.map(({ $ref }) => espnGetRef<RawInjury>($ref)),
  );
  const injuryCommentsByAthleteId = new Map<string, string>();
  for (const injuryRequest of injuryRequests) {
    if (injuryRequest.status === "rejected") {
      console.error(
        "Failed to load an ESPN injury report",
        injuryRequest.reason,
      );
      continue;
    }
    const { athlete, shortComment } = injuryRequest.value;
    const athleteId = athlete.$ref.match(ATHLETE_ID_IN_REF_PATTERN)?.[1];
    if (athleteId && shortComment) {
      injuryCommentsByAthleteId.set(athleteId, shortComment);
    }
  }
  return injuryCommentsByAthleteId;
}

export async function fetchTeamRoster(teamId: string): Promise<RosterPlayer[]> {
  const [rawRoster, injuryCommentsByAthleteId] = await Promise.all([
    espnGet<RawRosterResponse>("teamRoster", { pathParams: { teamId } }),
    // The reports only explain the injury statuses the roster already carries, so the roster loads without them.
    fetchInjuryCommentsByAthleteId(teamId).catch((error: unknown) => {
      console.error(`Failed to load the injuries of team ${teamId}`, error);
      return new Map<string, string>();
    }),
  ]);

  if (!Array.isArray(rawRoster.athletes)) {
    throw new Error(`ESPN roster for team ${teamId} has no athletes list`);
  }

  return rawRoster.athletes.map((athlete) =>
    mapRosterPlayer(athlete, injuryCommentsByAthleteId.get(athlete.id) ?? null),
  );
}
