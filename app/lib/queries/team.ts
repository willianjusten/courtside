import { queryOptions } from "@tanstack/react-query";
import {
  fetchTeamDetail,
  fetchTeamPlayoffSchedule,
  fetchTeamRoster,
  fetchTeamSchedule,
} from "@/app/lib/espn";

// Match the server cache periods of the ESPN client: the team detail for a day, the schedule for five minutes.
const TEAM_DETAIL_STALE_MILLISECONDS = 24 * 60 * 60 * 1000;
const TEAM_SCHEDULE_STALE_MILLISECONDS = 5 * 60 * 1000;

export function teamDetailQueryOptions(teamId: string) {
  return queryOptions({
    queryKey: ["team", teamId],
    queryFn: () => fetchTeamDetail(teamId),
    staleTime: TEAM_DETAIL_STALE_MILLISECONDS,
  });
}

export function teamScheduleQueryOptions(teamId: string) {
  return queryOptions({
    queryKey: ["team-schedule", teamId],
    queryFn: () => fetchTeamSchedule(teamId),
    staleTime: TEAM_SCHEDULE_STALE_MILLISECONDS,
  });
}

export function teamPlayoffScheduleQueryOptions(teamId: string) {
  return queryOptions({
    queryKey: ["team-playoff-schedule", teamId],
    queryFn: () => fetchTeamPlayoffSchedule(teamId),
    staleTime: TEAM_SCHEDULE_STALE_MILLISECONDS,
  });
}

export function teamRosterQueryOptions(teamId: string) {
  return queryOptions({
    queryKey: ["team-roster", teamId],
    queryFn: () => fetchTeamRoster(teamId),
  });
}
