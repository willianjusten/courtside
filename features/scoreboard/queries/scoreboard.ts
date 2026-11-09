import { queryOptions } from "@tanstack/react-query";
import type { NbaDate } from "@/lib/domain/nba-date";
import { fetchScoreboard } from "@/lib/espn";

export function scoreboardQueryOptions(nbaDate: NbaDate) {
  return queryOptions({
    queryKey: ["scoreboard", nbaDate],
    queryFn: () => fetchScoreboard(nbaDate),
  });
}
