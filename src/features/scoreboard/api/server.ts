import "server-only";
import type { NbaDate } from "@/types/nba-date";
import { loadGameCounts, loadSeasonCalendar } from "@/lib/server/loaders";
import { gameCountsQueryOptions } from "./game-counts";
import { seasonCalendarQueryOptions } from "./season-calendar";

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
