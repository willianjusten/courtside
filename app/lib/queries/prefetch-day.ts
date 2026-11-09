import type { NbaDate } from "@/app/lib/domain/nba-date";
import { dateRailRange } from "@/app/lib/home/home-view";
import { getServerQueryClient } from "@/app/lib/query/server";
import { seasonStartYearOf } from "@/app/lib/season/season-year";
import { serverQueries } from "@/app/lib/query/server-queries";

export function prefetchDayScoreboard(nbaDate: NbaDate) {
  const queryClient = getServerQueryClient();
  const { firstDate, lastDate } = dateRailRange(nbaDate);

  return Promise.all([
    queryClient.prefetchQuery(serverQueries.scoreboard(nbaDate)),
    // Prefetched so an empty day renders with its next game link.
    queryClient.prefetchQuery(
      serverQueries.seasonCalendar(seasonStartYearOf(nbaDate)),
    ),
    queryClient.prefetchQuery(serverQueries.gameCounts(firstDate, lastDate)),
  ]);
}
