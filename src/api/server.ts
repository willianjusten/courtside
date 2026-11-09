import "server-only";
import type { NbaDate } from "@/types/nba-date";
import {
  loadLeaders,
  loadScoreboard,
  loadStandings,
  loadTeamLeaders,
  loadTeams,
} from "@/lib/server/loaders";
import { leadersQueryOptions, teamLeadersQueryOptions } from "./leaders";
import { scoreboardQueryOptions } from "./scoreboard";
import { standingsQueryOptions } from "./standings";
import { teamsQueryOptions } from "./teams";

// The browser's query options with the server's memory-cached loaders, so a server prefetch hydrates the same query
// keys without calling the app's own /api routes.

export const scoreboardServerQuery = (nbaDate: NbaDate) => ({
  ...scoreboardQueryOptions(nbaDate),
  queryFn: () => loadScoreboard(nbaDate),
});

export const teamsServerQuery = () => ({
  ...teamsQueryOptions(),
  queryFn: loadTeams,
});

export const standingsServerQuery = () => ({
  ...standingsQueryOptions(),
  queryFn: loadStandings,
});

export const leadersServerQuery = () => ({
  ...leadersQueryOptions(),
  queryFn: loadLeaders,
});

export const teamLeadersServerQuery = (teamId: string) => ({
  ...teamLeadersQueryOptions(teamId),
  queryFn: () => loadTeamLeaders(teamId),
});
