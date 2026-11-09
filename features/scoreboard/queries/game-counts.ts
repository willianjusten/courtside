import { queryOptions } from "@tanstack/react-query";
import type { GameCounts } from "@/lib/domain/game";
import type { NbaDate } from "@/lib/domain/nba-date";
import { fetchApi } from "@/lib/query/fetch-api";

// The schedule rarely changes within a day, so counts are cached for an hour and never polled.
const GAME_COUNTS_STALE_MILLISECONDS = 60 * 60 * 1000;

export function gameCountsQueryOptions(firstDate: NbaDate, lastDate: NbaDate) {
  return queryOptions({
    queryKey: ["game-counts", firstDate, lastDate],
    // ESPN answers a date range with ~2 MB of games; the route counts them on the server and sends a few bytes.
    queryFn: () =>
      fetchApi<GameCounts>(
        `/api/game-counts?${new URLSearchParams({ from: firstDate, to: lastDate })}`,
      ),
    staleTime: GAME_COUNTS_STALE_MILLISECONDS,
  });
}
