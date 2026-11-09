import "server-only";
import type { NbaDate } from "@/lib/domain/nba-date";
import type { TeamSchedules } from "@/lib/domain/team";
import {
  fetchGameCounts,
  fetchGameSummary,
  fetchScoreboard,
  fetchSeasonCalendar,
  fetchStandings,
  fetchTeamDetail,
  fetchTeamPlayoffSchedule,
  fetchTeamRoster,
  fetchTeams,
  fetchTeamSchedule,
} from "@/lib/espn";
import { fetchLeaders, fetchTeamLeaders } from "@/lib/espn/leaders";
import { memoryCached } from "./memory-cache";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// How long each kind of data stays fresh, both in the server's memory and on Vercel's CDN for the /api routes.
export const CACHE_SECONDS = {
  // Live data: short enough that a server render never lags the browser's polling by much.
  scoreboard: 10,
  gameSummary: 10,
  seasonCalendar: HOUR,
  gameCounts: HOUR,
  teams: DAY,
  teamDetail: DAY,
  teamSchedules: 5 * MINUTE,
  teamRoster: 10 * MINUTE,
  standings: 5 * MINUTE,
  leaders: HOUR,
  teamLeaders: HOUR,
} as const;

export const loadScoreboard = (nbaDate: NbaDate) =>
  memoryCached(`scoreboard:${nbaDate}`, CACHE_SECONDS.scoreboard, () =>
    fetchScoreboard(nbaDate),
  );

export const loadGameSummary = (gameId: string) =>
  memoryCached(`summary:${gameId}`, CACHE_SECONDS.gameSummary, () =>
    fetchGameSummary(gameId),
  );

export const loadSeasonCalendar = (seasonStartYear: number) =>
  memoryCached(
    `season-calendar:${seasonStartYear}`,
    CACHE_SECONDS.seasonCalendar,
    () => fetchSeasonCalendar(seasonStartYear),
  );

export const loadGameCounts = (firstDate: NbaDate, lastDate: NbaDate) =>
  memoryCached(
    `game-counts:${firstDate}:${lastDate}`,
    CACHE_SECONDS.gameCounts,
    () => fetchGameCounts(firstDate, lastDate),
  );

export const loadTeams = () =>
  memoryCached("teams", CACHE_SECONDS.teams, fetchTeams);

export const loadTeamDetail = (teamId: string) =>
  memoryCached(`team:${teamId}`, CACHE_SECONDS.teamDetail, () =>
    fetchTeamDetail(teamId),
  );

export const loadTeamSchedules = (teamId: string) =>
  memoryCached(
    `team-schedules:${teamId}`,
    CACHE_SECONDS.teamSchedules,
    async (): Promise<TeamSchedules> => {
      const [regularSeason, postseason] = await Promise.all([
        fetchTeamSchedule(teamId),
        // Playoff games only add to the schedule, so a failure leaves the regular season standing.
        fetchTeamPlayoffSchedule(teamId).catch((error: unknown) => {
          console.error(`Failed to load the playoffs of team ${teamId}`, error);
          return [];
        }),
      ]);
      return { regularSeason, postseason };
    },
  );

export const loadTeamRoster = (teamId: string) =>
  memoryCached(`team-roster:${teamId}`, CACHE_SECONDS.teamRoster, () =>
    fetchTeamRoster(teamId),
  );

export const loadStandings = () =>
  memoryCached("standings", CACHE_SECONDS.standings, fetchStandings);

export const loadLeaders = () =>
  memoryCached("leaders", CACHE_SECONDS.leaders, fetchLeaders);

export const loadTeamLeaders = (teamId: string) =>
  memoryCached(`team-leaders:${teamId}`, CACHE_SECONDS.teamLeaders, () =>
    fetchTeamLeaders(teamId),
  );
