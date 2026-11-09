import { queryOptions } from "@tanstack/react-query";
import type {
  RosterPlayer,
  TeamDetail,
  TeamSchedules,
} from "@/lib/domain/team";
import { fetchApi } from "@/lib/query/fetch-api";

// Match the server cache periods in app/lib/server/loaders.ts.
const TEAM_DETAIL_STALE_MILLISECONDS = 24 * 60 * 60 * 1000;
const TEAM_SCHEDULE_STALE_MILLISECONDS = 5 * 60 * 1000;
const TEAM_ROSTER_STALE_MILLISECONDS = 10 * 60 * 1000;

const teamApiPath = (teamId: string, resource = "") =>
  `/api/teams/${encodeURIComponent(teamId)}${resource}`;

export function teamDetailQueryOptions(teamId: string) {
  return queryOptions({
    queryKey: ["team", teamId],
    queryFn: () => fetchApi<TeamDetail>(teamApiPath(teamId)),
    staleTime: TEAM_DETAIL_STALE_MILLISECONDS,
  });
}

// The regular season and playoff games in one request.
export function teamSchedulesQueryOptions(teamId: string) {
  return queryOptions({
    queryKey: ["team-schedules", teamId],
    queryFn: () => fetchApi<TeamSchedules>(teamApiPath(teamId, "/schedule")),
    staleTime: TEAM_SCHEDULE_STALE_MILLISECONDS,
  });
}

export function teamRosterQueryOptions(teamId: string) {
  return queryOptions({
    queryKey: ["team-roster", teamId],
    queryFn: () => fetchApi<RosterPlayer[]>(teamApiPath(teamId, "/roster")),
    staleTime: TEAM_ROSTER_STALE_MILLISECONDS,
  });
}
