import "server-only";
import {
  loadTeamDetail,
  loadTeamRoster,
  loadTeamSchedules,
} from "@/lib/server/loaders";
import {
  teamDetailQueryOptions,
  teamRosterQueryOptions,
  teamSchedulesQueryOptions,
} from "./team";

export const teamDetailServerQuery = (teamId: string) => ({
  ...teamDetailQueryOptions(teamId),
  queryFn: () => loadTeamDetail(teamId),
});

export const teamSchedulesServerQuery = (teamId: string) => ({
  ...teamSchedulesQueryOptions(teamId),
  queryFn: () => loadTeamSchedules(teamId),
});

export const teamRosterServerQuery = (teamId: string) => ({
  ...teamRosterQueryOptions(teamId),
  queryFn: () => loadTeamRoster(teamId),
});
