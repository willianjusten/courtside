import type { NbaDate } from "@/lib/domain/nba-date";
import { dateRailRange } from "@/features/scoreboard/home-view";
import { getServerQueryClient } from "@/lib/query/server";
import { seasonStartYearOf } from "@/lib/season/season-year";
import {
  gameCountsServerQuery,
  scoreboardServerQuery,
  seasonCalendarServerQuery,
} from "@/features/scoreboard/queries/server";

export function prefetchDayScoreboard(nbaDate: NbaDate) {
  const queryClient = getServerQueryClient();
  const { firstDate, lastDate } = dateRailRange(nbaDate);

  return Promise.all([
    queryClient.prefetchQuery(scoreboardServerQuery(nbaDate)),
    // Prefetched so an empty day renders with its next game link.
    queryClient.prefetchQuery(
      seasonCalendarServerQuery(seasonStartYearOf(nbaDate)),
    ),
    queryClient.prefetchQuery(gameCountsServerQuery(firstDate, lastDate)),
  ]);
}
