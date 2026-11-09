import { queryOptions } from "@tanstack/react-query";
import type { NbaDate } from "@/types/nba-date";
import { fetchScoreboard } from "@/lib/espn/scoreboard";

export function scoreboardQueryOptions(nbaDate: NbaDate) {
  return queryOptions({
    queryKey: ["scoreboard", nbaDate],
    queryFn: () => fetchScoreboard(nbaDate),
  });
}
