import type { NbaDate } from "@/types/nba-date";
import { dateRailRange } from "@/features/scoreboard/utils/home-view";
import { getServerQueryClient } from "@/lib/react-query/server";
import { seasonStartYearOf } from "@/utils/season-year";
import { scoreboardServerQuery } from "@/api/server";
import { gameCountsServerQuery, seasonCalendarServerQuery } from "./server";

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
