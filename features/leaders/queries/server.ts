import "server-only";
import { loadLeaders, loadTeamLeaders } from "@/lib/server/loaders";
import { leadersQueryOptions, teamLeadersQueryOptions } from "./leaders";

export const leadersServerQuery = () => ({
  ...leadersQueryOptions(),
  queryFn: loadLeaders,
});

export const teamLeadersServerQuery = (teamId: string) => ({
  ...teamLeadersQueryOptions(teamId),
  queryFn: () => loadTeamLeaders(teamId),
});
