import "server-only";
import type { NbaDate } from "@/app/lib/domain/nba-date";
import { gameCountsQueryOptions } from "@/app/lib/queries/game-counts";
import { gameSummaryQueryOptions } from "@/app/lib/queries/game-summary";
import { leadersQueryOptions } from "@/app/lib/queries/leaders";
import { scoreboardQueryOptions } from "@/app/lib/queries/scoreboard";
import { seasonCalendarQueryOptions } from "@/app/lib/queries/season-calendar";
import { standingsQueryOptions } from "@/app/lib/queries/standings";
import {
  teamDetailQueryOptions,
  teamLeadersQueryOptions,
  teamRosterQueryOptions,
  teamSchedulesQueryOptions,
} from "@/app/lib/queries/team";
import { teamsQueryOptions } from "@/app/lib/queries/teams";
import {
  loadGameCounts,
  loadGameSummary,
  loadLeaders,
  loadScoreboard,
  loadSeasonCalendar,
  loadStandings,
  loadTeamDetail,
  loadTeamLeaders,
  loadTeamRoster,
  loadTeams,
  loadTeamSchedules,
} from "@/app/lib/server/loaders";

// The browser's query options with the server's memory-cached loaders, so a server prefetch hydrates the same query
// keys without calling the app's own /api routes.
export const serverQueries = {
  scoreboard: (nbaDate: NbaDate) => ({
    ...scoreboardQueryOptions(nbaDate),
    queryFn: () => loadScoreboard(nbaDate),
  }),
  gameSummary: (gameId: string) => ({
    ...gameSummaryQueryOptions(gameId),
    queryFn: () => loadGameSummary(gameId),
  }),
  seasonCalendar: (seasonStartYear: number) => ({
    ...seasonCalendarQueryOptions(seasonStartYear),
    queryFn: () => loadSeasonCalendar(seasonStartYear),
  }),
  gameCounts: (firstDate: NbaDate, lastDate: NbaDate) => ({
    ...gameCountsQueryOptions(firstDate, lastDate),
    queryFn: () => loadGameCounts(firstDate, lastDate),
  }),
  teams: () => ({ ...teamsQueryOptions(), queryFn: loadTeams }),
  teamDetail: (teamId: string) => ({
    ...teamDetailQueryOptions(teamId),
    queryFn: () => loadTeamDetail(teamId),
  }),
  teamSchedules: (teamId: string) => ({
    ...teamSchedulesQueryOptions(teamId),
    queryFn: () => loadTeamSchedules(teamId),
  }),
  teamRoster: (teamId: string) => ({
    ...teamRosterQueryOptions(teamId),
    queryFn: () => loadTeamRoster(teamId),
  }),
  teamLeaders: (teamId: string) => ({
    ...teamLeadersQueryOptions(teamId),
    queryFn: () => loadTeamLeaders(teamId),
  }),
  standings: () => ({ ...standingsQueryOptions(), queryFn: loadStandings }),
  leaders: () => ({ ...leadersQueryOptions(), queryFn: loadLeaders }),
};
