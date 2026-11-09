import "server-only";
import type { NbaDate } from "@/lib/domain/nba-date";
import {
  loadGameCounts,
  loadScoreboard,
  loadSeasonCalendar,
} from "@/lib/server/loaders";
import { gameCountsQueryOptions } from "./game-counts";
import { scoreboardQueryOptions } from "./scoreboard";
import { seasonCalendarQueryOptions } from "./season-calendar";

export const scoreboardServerQuery = (nbaDate: NbaDate) => ({
  ...scoreboardQueryOptions(nbaDate),
  queryFn: () => loadScoreboard(nbaDate),
});

export const seasonCalendarServerQuery = (seasonStartYear: number) => ({
  ...seasonCalendarQueryOptions(seasonStartYear),
  queryFn: () => loadSeasonCalendar(seasonStartYear),
});

export const gameCountsServerQuery = (
  firstDate: NbaDate,
  lastDate: NbaDate,
) => ({
  ...gameCountsQueryOptions(firstDate, lastDate),
  queryFn: () => loadGameCounts(firstDate, lastDate),
});
