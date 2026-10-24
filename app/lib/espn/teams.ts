import type { Game } from "@/app/lib/domain/game";
import type {
  ListedTeam,
  RosterPlayer,
  TeamDetail,
  TeamSlug,
} from "@/app/lib/domain/team";
import {
  mapListedTeam,
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

export async function fetchTeamIdBySlug(
  slug: TeamSlug,
): Promise<string | null> {
  const teams = await fetchTeams();
  return teams.find((team) => team.slug === slug)?.id ?? null;
}

export async function fetchTeamDetail(teamId: string): Promise<TeamDetail> {
  const { team } = await espnGet<RawTeamDetailResponse>("team", {
    pathParams: { teamId },
  });

  return mapTeamDetail(team);
}

// Past and upcoming games of the current season type, in date order.
export async function fetchTeamSchedule(teamId: string): Promise<Game[]> {
  const rawSchedule = await espnGet<RawTeamScheduleResponse>("teamSchedule", {
    pathParams: { teamId },
  });

  // A missing events list means ESPN sent something unexpected, which must not read as a team without games.
  if (!Array.isArray(rawSchedule.events)) {
    throw new Error(`ESPN schedule for team ${teamId} has no events list`);
  }

  return rawSchedule.events.map(mapScheduleGame);
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
